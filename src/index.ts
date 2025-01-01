import {DiscordUpdateRequestManager} from "./message-manager";
import {YoutubeUploads} from "./entry-fetchers/youtube-uploads";
import config from "./config";
import {getTransformer as getUpdatesTransformer} from "./updates/transformers";
import {WebhookService} from "./update";

(async () => {
    const discordWebhookId = config.webhooks.discord.id;
    const discordWebhookToken = config.webhooks.discord.token;

    if (discordWebhookId === undefined || discordWebhookToken === undefined) {
        throw new Error('Discord webhook ID or token is not set');
    }

    let discordUpdateRequestManager = new DiscordUpdateRequestManager(
        discordWebhookId,
        discordWebhookToken,
    )

    // for (let i = 0; i < 30; i++) {
    //     discordUpdateRequestManager.add({
    //         type: UpdateType.YOUTUBE_UPLOAD,
    //         id: 'xd'
    //     })
    // }

    const unprocessedEntries = await (new YoutubeUploads).fetch()


    // foreach webhook service
    // -- get transformer, transform to request bodies, add to request manager, send all

    const transformedEntries = unprocessedEntries.map(entry => {
        const transformer = getUpdatesTransformer(WebhookService.Discord, entry.type)

        return transformer?.transform(entry)
    })

    transformedEntries.forEach(entry => {
        discordUpdateRequestManager.add(entry)
    })

    discordUpdateRequestManager.sendAll()
})().catch(error => {
    console.error('Error occurred:', error);
});