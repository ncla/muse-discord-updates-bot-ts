import {WebhookMessageCreateOptions} from "discord.js";
import {RateLimiterMemory, RateLimiterQueue} from "rate-limiter-flexible";

interface Update {
    tracker_id: string;
    content: string;
    image_url: string;
    url: string;
    timestamp: string;
    author: string;
    author_image_url: string;
}

interface WebhookMessage {
    webhookId: string;
    webhookToken: string;
    body: WebhookMessageCreateOptions
}

interface WebhookExecuteRequester {
    send(update: Update): Promise<void>
}

class AbstractUpdateRequestManager implements WebhookExecuteRequester {
    protected updates: Update[] = [];

    add(update: Update)
    {
        this.updates.push(update);
    }

    async send(update: Update): Promise<any> {
        console.warn('`send` method not implemented');
        return
    }
}

type PromiseFunction<T> = () => Promise<T>;

function retryPromise<T>(
    fn: PromiseFunction<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const attempt = (n: number) => {
            fn()
                .then(resolve)
                .catch((error) => {
                    console.error(error);

                    if (n === 1) {
                        console.error(`Exhausted all retries`);
                        reject(error);
                        return;
                    }

                    console.warn(`Retrying ${n}/${retries} in ${delay}ms`);

                    setTimeout(() => {
                        console.warn(`Retrying ${n}/${retries}`);
                        attempt(n - 1);
                    }, delay);
                });
        };

        attempt(retries);
    });
}

class FixedWindowRateLimitedRequestManager extends AbstractUpdateRequestManager {
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

export class DiscordUpdateRequestManager extends FixedWindowRateLimitedRequestManager {
    private _webhookId: string;

    private _webhookToken: string;

    constructor(webhookId: string, webhookToken: string) {
        super();
        this._webhookId = webhookId;
        this._webhookToken = webhookToken;
    }

    async send(update: Update): Promise<Response>
    {
        return await fetch(`https://discord.com/api/webhooks/${this._webhookId}/${this._webhookToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: 'hehe'
            }),
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