import {WebhookMessageCreateOptions} from "discord.js";
import {SpotifyPlaylistUpdate, UpdateType} from "@/src/updates";
import {getMentionableRoleIdString} from "./mentionable-role";

export class SpotifyPlaylist {
    transform(update: SpotifyPlaylistUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `**${update.author.name}** created a new playlist on Spotify`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        const embed = {
            title: `${update.title}`,
            description: update.content ? `\`\`\`\n${update.content}\n\`\`\`` : undefined,
            url: update.url,
            color: 0x1db954, // Spotify green color
            author: {
                name: update.author.name,
            },
            thumbnail: update.image_url ? {
                url: update.image_url
            } : undefined,
            fields: [
                {
                    name: 'Track Count',
                    value: update.track_count.toString(),
                    inline: true
                }
            ],
        };

        return {
            content: message,
            embeds: [embed]
        };
    }
}