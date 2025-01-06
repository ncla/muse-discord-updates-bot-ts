import {DiscordWebhookRequestManager} from "./request-manager";
import {YoutubeUploads} from "./entry-fetchers/youtube-uploads";
import config from "./config";
import {WebhookService} from "./update";
import {UpdatesRepositoryKysely} from "./repositories/updates-repository";
import {db} from "./database";
import {FeedProcessor} from "./processors/feed-processor";

(async () => {
    const discordWebhookId = config.webhooks.discord.id;
    const discordWebhookToken = config.webhooks.discord.token;

    if (discordWebhookId === undefined || discordWebhookToken === undefined) {
        throw new Error('Discord webhook ID or token is not set');
    }

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [new YoutubeUploads],
        new UpdatesRepositoryKysely(db),
        new DiscordWebhookRequestManager(discordWebhookId, discordWebhookToken)
    )

    feedProcessor.process()
})().catch(error => {
    console.error('Main app function error occurred:', error);
});