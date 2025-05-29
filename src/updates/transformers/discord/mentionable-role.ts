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
        case UpdateType.DOMAIN_CERTIFICATE:
            return config.pingable_mention_ids.discord.domain_certificates
        case UpdateType.MUSEMU_GIG:
            return config.pingable_mention_ids.discord.gigs
        case UpdateType.MUSEMU_STORE:
            return config.pingable_mention_ids.discord.store
        case UpdateType.MUSEMU_US_STORE:
            return config.pingable_mention_ids.discord.store
        case UpdateType.WARNER_CA_STORE:
            return config.pingable_mention_ids.discord.store
        case UpdateType.WARNER_AU_STORE:
            return config.pingable_mention_ids.discord.store
        case UpdateType.MUSEWIKI_CHANGE:
            return config.pingable_mention_ids.discord.musewiki
        default:
            return undefined
    }
}

export function getMentionableRoleIdString(updateType: UpdateType): string {
    const roleId = getMentionableRoleId(updateType)
    return roleId ? `<@&${roleId}>` : ''
}