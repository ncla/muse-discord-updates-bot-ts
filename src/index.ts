import {DiscordWebhookRequestManager} from "./request-manager";
import {YoutubeUploads} from "./entry-fetchers/youtube-uploads";
import config from "./config";
import {WebhookService} from "./update";
import {UpdatesRepositoryKysely} from "./repositories/updates-repository";
import {YoutubePlaylistsKysely} from "./repositories/youtube-playlists-repository";
import {
    db,
    InsertableUpdateRecord,
    InsertableYoutubePlaylistRecord,
    SelectableUpdateRecord,
    ReturnableYoutubePlaylistRecord
} from "./database";
import {FeedProcessor} from "./processors/feed-processor";
import {YoutubePlaylistVideos} from "./entry-fetchers/youtube-playlists";
import {Musebootlegs} from "./entry-fetchers/musebootlegs";

(async () => {
    const discordWebhookId = config.webhooks.discord.id;
    const discordWebhookToken = config.webhooks.discord.token;

    if (discordWebhookId === undefined || discordWebhookToken === undefined) {
        throw new Error('Discord webhook ID or token is not set');
    }

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [
            // new YoutubeUploads(config),
            // new YoutubePlaylistVideos(new YoutubePlaylistsKysely(db), config),
            new Musebootlegs(config)
        ],
        new UpdatesRepositoryKysely(db),
        new DiscordWebhookRequestManager(discordWebhookId, discordWebhookToken)
    )

    feedProcessor.process()
})().catch(error => {
    console.error('Main app function error occurred:', error);
});