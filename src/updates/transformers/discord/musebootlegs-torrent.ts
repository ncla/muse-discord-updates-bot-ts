import {DiscordUpdateTransformer, UpdateTransformer} from "@/src/updates/transformers";
import {Update} from "@/src/update";
import {WebhookMessageCreateOptions} from "discord.js";
import {formatDateTimeStringToUTC, truncateText} from "@/src/common";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class MusebootlegsTorrent implements DiscordUpdateTransformer {
    transform(update: Update): WebhookMessageCreateOptions {
        // TODO: Unsure about this type "guard" here
        if (
            typeof update.title !== 'string' ||
            typeof update.url !== 'string' ||
            update.author === null ||
            typeof update.author?.name !== 'string' ||
            !(update.created_at instanceof Date)
        ) {
            throw new Error('Missing required fields for YouTube playlist');
        }

        const baseMessageString = `New bootleg on musebootlegs.com`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        return {
            content: message,
            embeds: [
                {
                    title: truncateText(update.title, 250),
                    url: update.url,
                    description: update.content ? truncateText(update.content, 300) : undefined,
                    fields: [
                        {
                            name: 'Uploader',
                            value: update.author.name,
                        },
                        {
                            name: 'Uploaded at',
                            value: formatDateTimeStringToUTC(update.created_at)
                        }
                    ],
                    thumbnail: update.image_url ? { url: update.image_url } : undefined,
                    color: 3066993,
                }
            ]
        }
    }
}