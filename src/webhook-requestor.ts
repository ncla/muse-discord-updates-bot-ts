import {WebhookMessageCreateOptions} from "discord.js";
import * as fs from 'fs/promises';

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
        const formData = new FormData();
        
        const { files, ...payload } = body;
        formData.append('payload_json', JSON.stringify(payload));
        
        if (files && files.length > 0) {
            for (let index = 0; index < files.length; index++) {
                const file = files[index];

                if (typeof file === 'object' && file !== null && 'attachment' in file && 'name' in file) {
                    const fileObj = file as { attachment: string; name: string };

                    try {
                        const fileBuffer = await fs.readFile(fileObj.attachment);
                        formData.append(
                            `files[${index}]`,
                            new Blob([fileBuffer]),
                            fileObj.name || `attachment${index}`
                        );
                    } catch (error) {
                        console.error(`Failed to read file ${fileObj.attachment}:`, error);
                    }
                }
            }
        }
        
        return await fetch(`https://discord.com/api/webhooks/${this._webhookId}/${this._webhookToken}`, {
            method: 'POST',
            body: formData,
        })
        .then(async response => {
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            return response;
        });
    }
}