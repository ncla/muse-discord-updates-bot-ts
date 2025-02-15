import {PromiseFunction, retryPromise} from "@/src/common";
import {PromiseResult} from "@/src/types/promises";
import {RateLimiterMemory, RateLimiterQueue} from "rate-limiter-flexible";

export class FixedWindowRateLimitedActionableQueueManager<QueueableActionReturnType> {
    protected limiterQueue: RateLimiterQueue;

    constructor(
        requestAmountPerDuration: number = 5,
        rateLimitDurationSeconds: number = 2
    ) {
        const limiterFlexible = new RateLimiterMemory({
            points: requestAmountPerDuration,
            duration: rateLimitDurationSeconds,
        });

        this.limiterQueue = new RateLimiterQueue(limiterFlexible);

        return this;
    }

    async queue(queueableCallable: PromiseFunction<QueueableActionReturnType>): Promise<PromiseResult<QueueableActionReturnType>>
    {
        return new Promise((resolve, reject) => {
            this.limiterQueue
                .removeTokens(1)
                .then(() => {
                    retryPromise(
                        queueableCallable,
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
    }
}