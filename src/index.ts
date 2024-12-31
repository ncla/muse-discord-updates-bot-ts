import {DiscordUpdateRequestManager, UpdateType} from "./message-manager";

let discordUpdateRequestManager = new DiscordUpdateRequestManager(
    '',
    ''
)

for (let i = 0; i < 30; i++) {
    discordUpdateRequestManager.add({
        type: UpdateType.YOUTUBE_UPLOAD,
        id: 'xd'
    })
}

discordUpdateRequestManager.sendAll()