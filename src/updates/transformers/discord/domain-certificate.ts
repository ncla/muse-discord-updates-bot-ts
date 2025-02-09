import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {DomainCertificateUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions} from "discord.js";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class DomainCertificate implements DiscordUpdateTransformer {
    transform(update: DomainCertificateUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `New domain spotted through certificates`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        const domainFieldValue = update.id.startsWith('*.') ? update.id.substring(2) : update.id

        return {
            content: message,
            embeds: [
                {
                    color: 1752220,
                    fields: [
                        {
                            name: 'Website',
                            value: `[${domainFieldValue}](https://${domainFieldValue})`,
                        },
                        {
                            name: 'crt.sh',
                            value: '[View](https://crt.sh/?q=' + update.id + ')',
                        }
                    ]
                }
            ]
        }
    }
}