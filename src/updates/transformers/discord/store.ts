import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {MusemuStoreUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions} from "discord.js";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class MusemuStore implements DiscordUpdateTransformer {
    transform(update: MusemuStoreUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `New store item spotted`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        return {
            content: message,
            embeds: [
                {
                    title: update.title,
                    fields: [
                        {
                            name: 'Store',
                            value: 'EU'
                        }
                    ],
                    url: update.url,
                    color: 0,
                    thumbnail: {
                        url: update.image_url
                    }
                }
            ]
        }
    }
}