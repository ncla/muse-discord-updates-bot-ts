import {UpdateType} from "../../../update";
import config from "../../../config";

export function getMentionableRoleId(updateType: UpdateType): string | undefined {
    switch (updateType) {
        case UpdateType.YOUTUBE_UPLOAD:
            return config.pingable_mention_ids.discord.youtube_uploads
        default:
            return undefined
    }
}

export function getMentionableRoleIdString(updateType: UpdateType): string {
    const roleId = getMentionableRoleId(updateType)
    return roleId ? `<@&${roleId}>` : ''
}