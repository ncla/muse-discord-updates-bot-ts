import {DiscordUpdateTransformer, UpdateTransformer} from "../index";
import {Update} from "../../../update";
import {WebhookMessageCreateOptions} from "discord.js";

export class Json implements DiscordUpdateTransformer {
    transform(update: Update): WebhookMessageCreateOptions {
        return {
            content: JSON.stringify(update),
        }
    }
}