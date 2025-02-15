import config from "@/src/config";
import {FeedProcessor} from "@/src/processors/feed-processor";
import {WebhookService} from "@/src/updates";
import {DomainCertificates} from "@/src/entry-fetchers/domain-certificates";
import {UpdatesRepositoryKysely} from "@/src/repositories/updates-repository";
import {db} from "@/src/database";
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";
import {FixedWindowRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {YoutubeUploads} from "@/src/entry-fetchers/youtube-uploads";
import {YoutubePlaylistVideos} from "@/src/entry-fetchers/youtube-playlists";
import {YoutubePlaylistsKysely} from "@/src/repositories/youtube-playlists-repository";
import {Musebootlegs} from "@/src/entry-fetchers/musebootlegs";
import {EntryFetcher} from "@/src/entry-fetchers";

export class Process {
    public async run(argv: string[]) {
        console.log('Running process command with args:', argv);

        const discordWebhookId = config.webhooks.discord.id;
        const discordWebhookToken = config.webhooks.discord.token;

        if (discordWebhookId === undefined || discordWebhookToken === undefined) {
            throw new Error('Discord webhook ID or token is not set');
        }

        type FetcherFunction = () => EntryFetcher;

        const fetchersById: { [key: string]: FetcherFunction } = {
            'cert': () => new DomainCertificates(config.services.crtsh.domain),
            'yt-uploads': () => new YoutubeUploads(
                config.services.youtube.uploads_api_key,
                config.fetchables.youtube
            ),
            'yt-playlists': () => new YoutubePlaylistVideos(
                new YoutubePlaylistsKysely(db),
                config.services.youtube.playlists_api_key,
                config.fetchables.youtube
            ),
            'bootlegs': () => new Musebootlegs(
                config.services.musebootlegs.username,
                config.services.musebootlegs.password,
                config.services.musebootlegs.user_agent
            )
        }

        let fetcherIds = this.parseFetchersArgument(argv)

        fetcherIds.forEach(fetcher => {
            if (!fetchersById[fetcher]) {
                throw new Error(`Invalid fetcher: ${fetcher}`)
            }
        })

        // If no fetchers are specified, run all of them
        if (fetcherIds.length === 0) {
            fetcherIds = Object.keys(fetchersById)
        }

        console.info('Running process command with fetchers:', fetcherIds)

        const fetchers = fetcherIds.map(fetcher => fetchersById[fetcher]())

        const feedProcessor = new FeedProcessor(
            WebhookService.Discord,
            fetchers,
            new UpdatesRepositoryKysely(db),
            new DiscordWebhookExecuteRequestor(discordWebhookId, discordWebhookToken),
            new FixedWindowRateLimitedActionableQueueManager(5, 2)
        )

        return feedProcessor.process()
    }

     private parseFetchersArgument(argv: string[]): string[] {
        let fetchersArray: string[] = [];

        for (let i = 0; i < argv.length; i++) {
            if (argv[i].startsWith('--fetchers=')) {
                fetchersArray = argv[i].slice(11).split(',');
                break;
            }
        }

        return fetchersArray;
    }
}

new Process()
    .run(process.argv)
    .then(r => console.log('Process command ran successfully'))
    .catch(e => console.error('Process command failed:', e))