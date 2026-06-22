import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {LeakedCxThreadUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions, APIEmbed, APIEmbedField} from "discord.js";
import {formatDateTimeStringToUTC, truncateText} from "@/src/common";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class LeakedCxThread implements DiscordUpdateTransformer {
    transform(update: LeakedCxThreadUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `New thread matching "Muse" on leaked.cx`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        const embed: APIEmbed = {
            title: truncateText(update.title, 250),
            url: update.url,
            description: update.content ? truncateText(update.content, 300) : undefined,
            color: 0xE4022A,
        }

        const fields: APIEmbedField[] = []

        if (update.author.name !== null) {
            fields.push({
                name: 'Author',
                value: update.author.name,
            })
        }

        if (update.created_at !== null) {
            fields.push({
                name: 'Posted at',
                value: formatDateTimeStringToUTC(update.created_at),
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
