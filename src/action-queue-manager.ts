import {PromiseFunction, retryPromise} from "@/src/common";
import {PromiseResult} from "@/src/types/promises";
import {RateLimiterMemory, RateLimiterRes} from "rate-limiter-flexible";
import * as Sentry from "@sentry/node";
import { RateLimitException } from "@/src/exceptions/rate-limit-exception";
import { QueueException } from "@/src/exceptions/queue-exception";

export class DoubleRateLimitedActionableQueueManager<QueueableActionReturnType> {
    protected shortTermLimiter: RateLimiterMemory;
    protected longTermLimiter: RateLimiterMemory;
    protected shortTermKey: string = 'bursty';
    protected longTermKey: string = 'long';
    protected queuedActions: PromiseFunction<QueueableActionReturnType>[] = []
    protected workerInterval: NodeJS.Timeout | null = null;

    constructor(
        shortTermPoints: number = 5,
        shortTermDuration: number = 2,
        longTermPoints: number = 30,
        longTermDuration: number = 60,
    ) {
        // TODO: Since we are now using two rate limiters without queue from the rate-limiter-flexible package,
        // TODO: we could use the union rate limiter. ✨
        this.shortTermLimiter = new RateLimiterMemory({
            points: shortTermPoints,
            duration: shortTermDuration,
        });

        this.longTermLimiter = new RateLimiterMemory({
            points: longTermPoints,
            duration: longTermDuration,
        });

        return this;
    }

    /**
     * Queue a promise function to be executed. Will return pending promise, which will resolve when it queued callable gets executed.
     * This method will do the following:
     * 1. Push the queueable call to an array for later usage
     * 2. Attempt to run a single job immediately (possibly the one just got added to queue)
     * 3. Start worker interval if it has not started yet already
     */
    async queue(queueableCallable: PromiseFunction<QueueableActionReturnType>): Promise<PromiseResult<QueueableActionReturnType>>
    {
        return new Promise<PromiseResult<QueueableActionReturnType>>(async (resolve) => {
            this.queuedActions.push(async () => {
                return retryPromise(
                    queueableCallable,
                    3,
                    2500
                )
                .then(result => {
                    resolve({status: 'fulfilled', value: result})
                    return result
                })
                .catch(error => {
                    resolve({status: 'rejected', reason: error})
                    if (!(error instanceof RateLimitException) &&
                        !(error instanceof QueueException) &&
                        !(error instanceof RateLimiterRes)
                    ) {
                        Sentry.captureException(error);
                    }
                    return error
                });
            })

            try {
                this.startWorkerIfNotRunning()
            } catch (error) {
                console.error(error)
                if (
                    !(error instanceof RateLimitException) &&
                    !(error instanceof QueueException) &&
                    !(error instanceof RateLimiterRes)
                ) {
                    Sentry.captureException(error);
                }
            }

            try {
                await this.attemptToRunFirstActionable()
            } catch (error) {
                console.error(error)
                if (
                    !(error instanceof RateLimitException) &&
                    !(error instanceof QueueException) &&
                    !(error instanceof RateLimiterRes)
                ) {
                    Sentry.captureException(error);
                }
            }
        })
    }

    private async attemptToRunFirstActionable()
    {
        const shortTermRateLimitConsumption = await this.consumeRateLimit(this.shortTermLimiter, this.shortTermKey)

        if (shortTermRateLimitConsumption !== true) {
            throw new RateLimitException('Rate limit exceeded for short term rate limiter')
        }

        const longTermRateLimitConsumption = await this.consumeRateLimit(this.longTermLimiter, this.longTermKey)

        if (longTermRateLimitConsumption !== true) {
            throw new RateLimitException('Rate limit exceeded for long term rate limiter')
        }

        if (this.queuedActions.length === 0) {
            throw new QueueException('Empty queue')
        }

        const callableAction = this.queuedActions.shift()

        if (callableAction === undefined) {
            throw new QueueException('Empty queue')
        }

        return callableAction()
    }

    private async attemptToRunAllJobs()
    {
        console.log('Attempting to run all jobs', this.queuedActions.length)

        // Run all the possible jobs until we hit an attempt where we are rate limited
        while (this.queuedActions.length > 0) {
            try {
                await this.attemptToRunFirstActionable();
            } catch (error) {
                console.error(error)
                if (
                    !(error instanceof RateLimitException) &&
                    !(error instanceof QueueException) &&
                    !(error instanceof RateLimiterRes)
                ) {
                    Sentry.captureException(error);
                }
                break
            }
        }
    }

    private async consumeRateLimit(limiter: RateLimiterMemory, rateLimiterKey: string): Promise<boolean | Error | RateLimiterRes>
    {
        return new Promise((resolve, reject) => {
            // https://github.com/animir/node-rate-limiter-flexible/wiki/API-methods#ratelimiterconsumekey-points--1-options--
            limiter
                .consume(rateLimiterKey, 1)
                .then(() => {
                    resolve(true)
                })
                .catch((error) => {
                    console.error(error)
                    if (
                        !(error instanceof RateLimitException) &&
                        !(error instanceof QueueException) &&
                        !(error instanceof RateLimiterRes)
                    ) {
                        Sentry.captureException(error);
                    }
                    resolve(error)
                });
        })
    }

    private startWorkerIfNotRunning()
    {
        if (this.workerInterval === null) {
            this.startWorker()
        }
    }

    private startWorker()
    {
        this.workerInterval = setInterval(this.attemptToRunAllJobs.bind(this), 1000)
    }

    public stopWorker()
    {
        if (this.workerInterval === null) {
            return false
        }

        clearInterval(this.workerInterval)
        this.workerInterval = null

        return true
    }
}