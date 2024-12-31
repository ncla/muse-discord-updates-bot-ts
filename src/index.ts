import {DiscordUpdateRequestManager, UpdateType} from "./message-manager";
import {YoutubeUploads} from "./entry-fetchers/youtube-uploads";
import config from "./config";

const discordWebhookId = config.webhooks.discord.id;
const discordWebhookToken = config.webhooks.discord.token;

if (discordWebhookId === undefined || discordWebhookToken === undefined) {
    throw new Error('Discord webhook ID or token is not set');
}

let discordUpdateRequestManager = new DiscordUpdateRequestManager(
    discordWebhookId,
    discordWebhookToken,
)

for (let i = 0; i < 30; i++) {
    discordUpdateRequestManager.add({
        type: UpdateType.YOUTUBE_UPLOAD,
        id: 'xd'
    })
}

new YoutubeUploads().fetch().then(console.log)

// discordUpdateRequestManager.sendAll()