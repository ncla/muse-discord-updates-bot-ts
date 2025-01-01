import {UpdateTransformer} from "../index";
import {Update} from "../../../update";
import {WebhookMessageCreateOptions} from "discord.js";

export class Json implements UpdateTransformer {
    transform(update: Update): WebhookMessageCreateOptions {
        return {
            content: JSON.stringify(update),
        }
    }
}