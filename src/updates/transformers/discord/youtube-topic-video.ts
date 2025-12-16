import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {YoutubeTopicVideoUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions} from "discord.js";
import {formatDateTimeStringToUTC, truncateText} from "@/src/common";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class YoutubeTopicVideo implements DiscordUpdateTransformer {
    transform(update: YoutubeTopicVideoUpdate): WebhookMessageCreateOptions {
        const baseMessageString = 'New auto-generated video spotted on topic channel'
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
                    color: 16711680,
                    footer: {
                        text: `Published at ${formatDateTimeStringToUTC(update.created_at)} UTC+0`,
                    }
                }
            ]
        }
    }
}
