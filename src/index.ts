import {DiscordUpdateRequestManager} from "./message-manager";

let discordUpdateRequestManager = new DiscordUpdateRequestManager(
    '',
    ''
)

for (let i = 0; i < 30; i++) {
    discordUpdateRequestManager.add({
        author: "", author_image_url: "", content: "", image_url: "", timestamp: "", tracker_id: "", url: ""
    })
}

discordUpdateRequestManager.sendAll()