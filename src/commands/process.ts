import config from "@/src/config";
import {FeedProcessor, FetcherExecutionMode} from "@/src/processors/feed-processor";
import {WebhookService} from "@/src/updates";
import {DomainCertificates} from "@/src/entry-fetchers/domain-certificates";
import {UpdatesRepositoryKysely} from "@/src/repositories/updates-repository";
import {db, InsertableUpdateRecord, SelectableUpdateRecord} from "@/src/database";
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";
import {DoubleRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {YoutubeUploads} from "@/src/entry-fetchers/youtube-uploads";
import {YoutubePlaylistVideos} from "@/src/entry-fetchers/youtube-playlists";
import {YoutubePlaylistsKysely} from "@/src/repositories/youtube-playlists-repository";
import {Musebootlegs} from "@/src/entry-fetchers/musebootlegs";
import {EntryFetcher} from "@/src/entry-fetchers";
import {MusemuGigs} from "@/src/entry-fetchers/musemu-gigs";
import {MusemuStore} from "@/src/entry-fetchers/musemu-store";
import {WarnerMusicCanadaStore} from "@/src/entry-fetchers/warnermusic-ca-store";
import {MusemuUsStore} from "@/src/entry-fetchers/musemu-us-store";
import {WarnermusicAustraliaStore} from "@/src/entry-fetchers/warnermusic-au-store";
import {MuseWikiChanges} from "@/src/entry-fetchers/musewiki-changes";
import {FacebookAdLibrary} from "@/src/entry-fetchers/facebook-ad-library";
import {SpotifyPlaylists} from "@/src/entry-fetchers/spotify-playlists";
import * as Sentry from "@sentry/node";

export class Process {
    public async run(argv: string[]) {
        console.log('Running process command with args:', argv);

        const discordWebhookId = this.parseDiscordWebhookId(argv) || config.webhooks.discord.id;
        const discordWebhookToken = this.parseDiscordWebhookToken(argv) || config.webhooks.discord.token;
        const executionMode = this.parseExecutionMode(argv);

        if (discordWebhookId === undefined || discordWebhookToken === undefined) {
            throw new Error('Discord webhook ID or token is not set');
        }

        console.info(`Using execution mode: ${executionMode}`);

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
            ),
            'musemu-gigs': () => new MusemuGigs(),
            'musemu-store': () => new MusemuStore(),
            'musemu-us-store': () => new MusemuUsStore(),
            'warner-ca-store': () => new WarnerMusicCanadaStore(),
            'warner-au-store': () => new WarnermusicAustraliaStore(),
            'musewiki': () => new MuseWikiChanges(),
            'facebook-ads': () => new FacebookAdLibrary(config.services.facebook.ad_library_page_id),
            'spotify-playlists': () => new SpotifyPlaylists(
                config.services.spotify.client_id,
                config.services.spotify.client_secret,
                config.fetchables.spotify
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

        const feedProcessor = new FeedProcessor<
            InsertableUpdateRecord,
            SelectableUpdateRecord,
            WebhookService.Discord
        >(
            WebhookService.Discord,
            fetchers,
            new UpdatesRepositoryKysely(db),
            new DiscordWebhookExecuteRequestor(discordWebhookId, discordWebhookToken),
            new DoubleRateLimitedActionableQueueManager(5, 2, 30, 60),
            executionMode
        )

        const summary = await feedProcessor.process()

        const fetcherSummariesWithErrors = summary.fetcherSummaries.filter(fetcherSummary => fetcherSummary.errors.length > 0);

        if (fetcherSummariesWithErrors.length > 0) {
            console.info('Fetchers with errors:');

            for (const fetcherSummary of fetcherSummariesWithErrors) {
                console.info(`Fetcher: ${fetcherSummary.name}`);
                console.info(`Errors: ${fetcherSummary.errors.length}`);
                for (const error of fetcherSummary.errors) {
                    console.error(error);
                }
            }
        }

        if (summary.webhookRequestSummary.errors && summary.webhookRequestSummary.errors.length > 0) {
            console.info('Errors in webhook requests:');
            for (const error of summary.webhookRequestSummary.errors) {
                console.error(error);
            }
        }

        console.info('Process command fetcher summary:')

        for (const fetcherSummary of summary.fetcherSummaries) {
            console.info(`Fetcher: ${fetcherSummary.name}`)
            console.info(`Entries: ${fetcherSummary.entries.length}`)
            console.info(`Entries in database already: ${fetcherSummary.entriesInDatabaseAlready.length}`)
            console.info(`Entries processed: ${fetcherSummary.entriesProcessed.length}`)
            console.info(`Entries transformed: ${fetcherSummary.entriesTransformed.length}`)
            console.info(`Errors: ${fetcherSummary.errors.length}`)
        }

        console.info('Process command webhook request summary:')
        console.info(`Webhook service: ${summary.webhookRequestSummary.webhookService}`)
        console.info(`Responses: ${summary.webhookRequestSummary.responses.length}`)
        console.info(`Errors: ${summary.webhookRequestSummary.errors.length}`)
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

    private parseDiscordWebhookId(argv: string[]): string | undefined {
        for (let i = 0; i < argv.length; i++) {
            if (argv[i].startsWith('--discord-webhook-id=')) {
                return argv[i].slice(21);
            }
        }

        return undefined;
    }

    private parseDiscordWebhookToken(argv: string[]): string | undefined {
        for (let i = 0; i < argv.length; i++) {
            if (argv[i].startsWith('--discord-webhook-token=')) {
                return argv[i].slice(24);
            }
        }

        return undefined;
    }

    private parseExecutionMode(argv: string[]): FetcherExecutionMode {
        for (let i = 0; i < argv.length; i++) {
            if (argv[i].startsWith('--execution-mode=')) {
                const mode = argv[i].slice(17).toLowerCase();

                if (mode === 'sequential') {
                    return FetcherExecutionMode.Sequential;
                }
            }
        }

        return FetcherExecutionMode.Parallel;
    }
}

new Process()
    .run(process.argv)
    .then(() => console.log('Process command ran successfully'))
    .catch(error => {
        console.error('Process command failed:', error);
        Sentry.captureException(error);
    })
