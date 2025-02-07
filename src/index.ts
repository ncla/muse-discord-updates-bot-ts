import {DiscordWebhookRequestManager} from "@/src/request-manager";
import {YoutubeUploads} from "@/src/entry-fetchers/youtube-uploads";
import config from "@/src/config";
import {WebhookService} from "@/src/updates";
import {UpdatesRepositoryKysely} from "@/src/repositories/updates-repository";
import {YoutubePlaylistsKysely} from "@/src/repositories/youtube-playlists-repository";
import {db, InsertableYoutubePlaylistRecord, ReturnableYoutubePlaylistRecord} from "@/src/database";
import {FeedProcessor} from "@/src/processors/feed-processor";
import {YoutubePlaylistVideos} from "@/src/entry-fetchers/youtube-playlists";
import {Musebootlegs} from "@/src/entry-fetchers/musebootlegs";

(async () => {
    const discordWebhookId = config.webhooks.discord.id;
    const discordWebhookToken = config.webhooks.discord.token;

    if (discordWebhookId === undefined || discordWebhookToken === undefined) {
        throw new Error('Discord webhook ID or token is not set');
    }

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [
            new YoutubeUploads(config),
            new YoutubePlaylistVideos(new YoutubePlaylistsKysely(db), config),
            new Musebootlegs(config)
        ],
        new UpdatesRepositoryKysely(db),
        new DiscordWebhookRequestManager(discordWebhookId, discordWebhookToken)
    )

    feedProcessor.process()
})().catch(error => {
    console.error('Main app function error occurred:', error);
});