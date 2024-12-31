import {Update, WebhookService} from "../../update";
import {UpdateType} from "../../message-manager";
import {JsonForDiscord} from "./json-for-discord";

export interface UpdateTransformer {
    transform(update: Update): any;
}

export function getTransformer(webhookService: WebhookService, updateType: UpdateType): UpdateTransformer | null {
    switch (webhookService) {
        case WebhookService.Discord:
            switch (updateType) {
                case UpdateType.YOUTUBE_UPLOAD:
                    return new JsonForDiscord;
                default:
                    throw new Error(`No transformer found for update type ${updateType}, webhook service ${webhookService}`);
            }
        default:
            throw new Error(`No transformers available for service ${updateType}`);
    }
}