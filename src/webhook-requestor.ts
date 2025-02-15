import {WebhookMessageCreateOptions} from "discord.js";

export interface WebhookExecuteRequestor<RequestBody, ResponseResultReturnable> {
    send(body: RequestBody): Promise<ResponseResultReturnable>
}

export class DiscordWebhookExecuteRequestor implements WebhookExecuteRequestor<WebhookMessageCreateOptions, Response> {
    private _webhookId: string;

    private _webhookToken: string;

    constructor(
        webhookId: string,
        webhookToken: string
    ) {
        this._webhookId = webhookId;
        this._webhookToken = webhookToken;
    }

    async send(body: WebhookMessageCreateOptions): Promise<Response>
    {
        return await fetch(`https://discord.com/api/webhooks/${this._webhookId}/${this._webhookToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })
        .then(async response => {
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            return response;
        })
    }
}