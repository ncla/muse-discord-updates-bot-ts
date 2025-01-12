import {DiscordUpdateTransformer, UpdateTransformer} from "../index";
import {Update} from "../../../update";
import {WebhookMessageCreateOptions} from "discord.js";
import {formatDateTimeStringToUTC, truncateText} from "../../../common";
import {getMentionableRoleIdString} from "./mentionable-role";

export class YoutubeUpload implements DiscordUpdateTransformer {
    transform(update: Update): WebhookMessageCreateOptions {
        // TODO: Unsure about this type "guard" here
        if (
            typeof update.title !== 'string' ||
            typeof update.url !== 'string' ||
            typeof update.image_url !== 'string' ||
            update.author === null ||
            typeof update.author?.name !== 'string' ||
            typeof update.author?.image_url !== 'string' ||
            !(update.created_at instanceof Date)
        ) {
            throw new Error('Missing required fields for YouTube upload');
        }

        const baseMessageString = `**${update.author.name}** uploaded a video on YouTube`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        return {
            content: message,
            embeds: [
                {
                    title: truncateText(update.title, 250),
                    url: update.url,
                    description: update.content ? truncateText(update.content, 1000) : undefined,
                    author: {
                        name: update.author.name,
                        icon_url: update.author.image_url
                    },
                    thumbnail: {
                        url: update.image_url
                    },
                    color: 15158332,
                    footer: {
                        text: `Uploaded at ${formatDateTimeStringToUTC(update.created_at)} UTC+0`,
                    }
                }
            ]
        }
    }
}