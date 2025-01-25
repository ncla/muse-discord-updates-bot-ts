import {WebhookMessageCreateOptions} from "discord.js";
import {RateLimiterMemory, RateLimiterQueue} from "rate-limiter-flexible";
import {retryPromise} from "@/src/common";
import {PromiseResult} from "@/src/types/promises";

export interface WebhookExecuteRequester<UpdateRequestBody> {
    send(update: UpdateRequestBody): Promise<Response>
    sendAll(): void
}

export abstract class AbstractUpdateRequestManager<UpdateRequestBody> implements WebhookExecuteRequester<UpdateRequestBody> {
    protected requestBodies: UpdateRequestBody[] = [];

    add(requestBody: UpdateRequestBody)
    {
        this.requestBodies.push(requestBody);
    }

    count(): number
    {
        return this.requestBodies.length;
    }

    abstract send(update: UpdateRequestBody): Promise<Response>;

    abstract sendAll(): void;
}

abstract class FixedWindowRateLimitedRequestManager<UpdateRequestBody> extends AbstractUpdateRequestManager<UpdateRequestBody> {
    async sendAll(requestAmountPerDuration: number = 5, rateLimitDurationSeconds: number = 2): Promise<PromiseResult<Response>[]>
    {
        const limiterFlexible = new RateLimiterMemory({
            points: requestAmountPerDuration,
            duration: rateLimitDurationSeconds,
        });

        const limiterQueue = new RateLimiterQueue(limiterFlexible);

        let sendPromises: Promise<PromiseResult<Response>>[] = []

        for (let i = 0; i < this.requestBodies.length; i++) {
            sendPromises.push(
                new Promise((resolve, reject) => {
                    limiterQueue
                        .removeTokens(1)
                        .then(() => {
                            retryPromise(
                                () => this.send(this.requestBodies[i]),
                                3,
                                2500
                            )
                            .then(result => resolve({status: 'fulfilled', value: result}))
                            .catch(error => resolve({status: 'rejected', reason: error}));
                        })
                        .catch((error) => {
                            resolve({status: 'rejected', reason: error})
                        })
                })
            )
        }

        return await Promise.all(sendPromises);
    }
}

export class DiscordWebhookRequestManager extends FixedWindowRateLimitedRequestManager<WebhookMessageCreateOptions> {
    private _webhookId: string;

    private _webhookToken: string;

    constructor(webhookId: string, webhookToken: string) {
        super();
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