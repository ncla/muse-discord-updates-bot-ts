import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {MuseBootlegsTorrentUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions, APIEmbed, APIEmbedField } from "discord.js";
import {formatDateTimeStringToUTC, truncateText} from "@/src/common";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class MusebootlegsTorrent implements DiscordUpdateTransformer {
    transform(update: MuseBootlegsTorrentUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `New bootleg on musebootlegs.com`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        const embed: APIEmbed = {
            title: truncateText(update.title, 250),
            url: update.url ?? undefined,
            description: update.content ? truncateText(update.content, 300) : undefined,
            thumbnail: update.image_url ? { url: update.image_url } : undefined,
            color: 3066993,
        }

        const fields: APIEmbedField[] = []

        if (update.author.name !== null) {
            fields.push({
                name: 'Uploader',
                value: update.author.name,
            })
        }

        if (update.created_at !== null) {
            fields.push({
                name: 'Uploaded at',
                value: formatDateTimeStringToUTC(update.created_at)
            })
        }

        if (fields.length) {
            embed.fields = fields
        }

        return {
            content: message,
            embeds: [
                embed
            ]
        }
    }
}