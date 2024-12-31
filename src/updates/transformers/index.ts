import {Update, WebhookService} from "../../update";
import {UpdateType} from "../../message-manager";
import {Json as DefaultJsonDiscordTransformer } from "./discord/json";

export interface UpdateTransformer {
    transform(update: Update): any;
}

export function getTransformer(webhookService: WebhookService, updateType: UpdateType): UpdateTransformer | null {
    switch (webhookService) {
        case WebhookService.Discord:
            switch (updateType) {
                default:
                    return new DefaultJsonDiscordTransformer;
            }
        default:
            throw new Error(`No transformers available for service ${updateType}`);
    }
}