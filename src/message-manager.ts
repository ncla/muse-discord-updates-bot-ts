import {WebhookMessageCreateOptions} from "discord.js";
import {RateLimiterMemory, RateLimiterQueue} from "rate-limiter-flexible";
import {retryPromise} from "./common";

interface WebhookExecuteRequester<UpdateRequestBody> {
    send(update: UpdateRequestBody): Promise<Response>
}

class AbstractUpdateRequestManager<UpdateRequestBody> implements WebhookExecuteRequester<UpdateRequestBody> {
    protected updates: UpdateRequestBody[] = [];

    add(update: UpdateRequestBody)
    {
        this.updates.push(update);
    }

    async send(update: UpdateRequestBody): Promise<any> {
        console.warn('`send` method not implemented');
        return
    }
}

class FixedWindowRateLimitedRequestManager<UpdateRequestBody> extends AbstractUpdateRequestManager<UpdateRequestBody> {
    sendAll(requestAmountPerDuration: number = 5, rateLimitDurationSeconds: number = 2)
    {
        const limiterFlexible = new RateLimiterMemory({
            points: requestAmountPerDuration,
            duration: rateLimitDurationSeconds,
        });

        const limiterQueue = new RateLimiterQueue(limiterFlexible, {
            maxQueueSize: 5,
        });

        for (let i = 0; i < this.updates.length; i++) {
            limiterQueue
                .removeTokens(1)
                .then(() => {
                    retryPromise(
                        () => this.send(this.updates[i]),
                        3,
                        2500
                    )
                    .then(result => console.log('3', result.status))
                    .catch(error => console.error('4', error));
                })
                .catch(() => {
                    console.log('Warning: Queue is full, delaying request')
                })
        }
    }
}

export class DiscordUpdateRequestManager extends FixedWindowRateLimitedRequestManager<WebhookMessageCreateOptions> {
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

            console.log(`Timestamp: ${new Date().toISOString()} | Status: ${response.status}`);

            return response;
        })
    }
}