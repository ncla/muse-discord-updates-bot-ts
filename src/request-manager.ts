import {WebhookMessageCreateOptions} from "discord.js";
import {RateLimiterMemory, RateLimiterQueue} from "rate-limiter-flexible";
import {retryPromise} from "./common";

interface WebhookExecuteRequester<UpdateRequestBody> {
    send(update: UpdateRequestBody): Promise<Response>
}

abstract class AbstractUpdateRequestManager<UpdateRequestBody> implements WebhookExecuteRequester<UpdateRequestBody> {
    protected requestBodies: UpdateRequestBody[] = [];

    add(requestBody: UpdateRequestBody)
    {
        this.requestBodies.push(requestBody);
    }

    abstract send(update: UpdateRequestBody): Promise<Response>;

    abstract sendAll(): void;
}

abstract class FixedWindowRateLimitedRequestManager<UpdateRequestBody> extends AbstractUpdateRequestManager<UpdateRequestBody> {
    sendAll(requestAmountPerDuration: number = 5, rateLimitDurationSeconds: number = 2)
    {
        const limiterFlexible = new RateLimiterMemory({
            points: requestAmountPerDuration,
            duration: rateLimitDurationSeconds,
        });

        const limiterQueue = new RateLimiterQueue(limiterFlexible);

        for (let i = 0; i < this.requestBodies.length; i++) {
            limiterQueue
                .removeTokens(1)
                .then(() => {
                    retryPromise(
                        () => this.send(this.requestBodies[i]),
                        3,
                        2500
                    )
                    .then(result => console.log('3', result.status))
                    .catch(error => console.error('4', error));
                })
                .catch((err) => {
                    console.error(err)
                })
        }
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

            console.log(`Timestamp: ${new Date().toISOString()} | Status: ${response.status}`);

            return response;
        })
    }
}