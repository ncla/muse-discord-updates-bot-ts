import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {YoutubePlaylistUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions} from "discord.js";
import {formatDateTimeStringToUTC, truncateText} from "@/src/common";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class YoutubePlaylistVideo implements DiscordUpdateTransformer {
    transform(update: YoutubePlaylistUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `**${update.author.name}** has added new video to a playlist`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        return {
            content: message,
            embeds: [
                {
                    title: truncateText(update.title, 250),
                    url: update.url,
                    fields: [
                        {
                            name: 'Playlist',
                            value: update.parent_title,
                        },
                        {
                            name: 'Video',
                            value: update.title,
                        }
                    ],
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