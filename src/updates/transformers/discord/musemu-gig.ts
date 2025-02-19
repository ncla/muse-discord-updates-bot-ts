import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {MuseMuGigsUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions} from "discord.js";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";
import {formatDateTimeStringToUTC} from "@/src/common";

export class MusemuGig implements DiscordUpdateTransformer {
    transform(update: MuseMuGigsUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `New gig spotted on muse.mu tour page`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        return {
            content: message,
            embeds: [
                {
                    title: update.title,
                    url: update.url,
                    timestamp: formatDateTimeStringToUTC(update.event_date),
                    color: 0,
                }
            ]
        }
    }
}