import {DiscordUpdateTransformer} from "@/src/updates/transformers";
import {Muse1420mhzDeployUpdate} from "@/src/updates";
import {WebhookMessageCreateOptions} from "discord.js";
import {getMentionableRoleIdString} from "@/src/updates/transformers/discord/mentionable-role";

export class Muse1420mhzDeploy implements DiscordUpdateTransformer {
    transform(update: Muse1420mhzDeployUpdate): WebhookMessageCreateOptions {
        const baseMessageString = `1420mhz.muse.mu — new deploy detected`
        const mentionRoleIdString = getMentionableRoleIdString(update.type)
        const message = [mentionRoleIdString, baseMessageString].filter(Boolean).join(' ')

        return {
            content: message,
            embeds: [
                {
                    color: 14942250, // #E4022A — site primary red
                    fields: [
                        {
                            name: 'Site',
                            value: `[1420mhz.muse.mu](${update.url})`,
                        },
                        {
                            name: 'Deploy ID',
                            value: `\`${update.id}\``,
                        }
                    ]
                }
            ]
        }
    }
}
