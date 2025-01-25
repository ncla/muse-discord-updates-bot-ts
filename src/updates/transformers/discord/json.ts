import {DiscordUpdateTransformer, UpdateTransformer} from "@/src/updates/transformers";
import {Update} from "@/src/update";
import {WebhookMessageCreateOptions} from "discord.js";

export class Json implements DiscordUpdateTransformer {
    transform(update: Update): WebhookMessageCreateOptions {
        return {
            content: JSON.stringify(update),
        }
    }
}