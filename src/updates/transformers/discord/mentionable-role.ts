import {UpdateType} from "@/src/updates";
import config from "@/src/config";

export function getMentionableRoleId(updateType: UpdateType): string | undefined {
    switch (updateType) {
        case UpdateType.MUSEBOOTLEGS_TORRENT:
            return config.pingable_mention_ids.discord.musebootlegs_torrents
        case UpdateType.YOUTUBE_UPLOAD:
            return config.pingable_mention_ids.discord.youtube_uploads
        case UpdateType.YOUTUBE_PLAYLIST_VIDEO:
            return config.pingable_mention_ids.discord.youtube_playlist_videos
        default:
            return undefined
    }
}

export function getMentionableRoleIdString(updateType: UpdateType): string {
    const roleId = getMentionableRoleId(updateType)
    return roleId ? `<@&${roleId}>` : ''
}