import {PromiseFunction} from "@/src/common";
import {PromiseResult} from "@/src/types/promises";
import {RateLimiterMemory, ConsumeResult} from "@/src/rate-limiter";
import * as Sentry from "@sentry/node";
import { RateLimitException } from "@/src/exceptions/rate-limit-exception";
import { QueueException } from "@/src/exceptions/queue-exception";

interface QueueEntry<T> {
    action: PromiseFunction<T>;
    resolve: (result: PromiseResult<T>) => void;
    retriesLeft: number;
    notBefore: number;
}

export class DoubleRateLimitedActionableQueueManager<QueueableActionReturnType> {
    protected shortTermLimiter: RateLimiterMemory;
    protected longTermLimiter: RateLimiterMemory;
    protected shortTermKey: string = 'bursty';
    protected longTermKey: string = 'long';
    protected queuedEntries: QueueEntry<QueueableActionReturnType>[] = []
    protected workerInterval: NodeJS.Timeout | null = null;
    protected maxRetries: number;
    protected retryDelayMs: number;

    constructor(
        shortTermPoints: number = 5,
        shortTermDuration: number = 2,
        longTermPoints: number = 30,
        longTermDuration: number = 60,
        maxRetries: number = 3,
        retryDelayMs: number = 2500,
    ) {
        this.shortTermLimiter = new RateLimiterMemory({
            points: shortTermPoints,
            durationSeconds: shortTermDuration,
        });

        this.longTermLimiter = new RateLimiterMemory({
            points: longTermPoints,
            durationSeconds: longTermDuration,
        });

        this.maxRetries = maxRetries;
        this.retryDelayMs = retryDelayMs;
    }

    async queue(queueableCallable: PromiseFunction<QueueableActionReturnType>): Promise<PromiseResult<QueueableActionReturnType>>
    {
        return new Promise<PromiseResult<QueueableActionReturnType>>((resolve) => {
            this.queuedEntries.push({
                action: queueableCallable,
                resolve,
                retriesLeft: this.maxRetries,
                notBefore: 0,
            });

            this.startWorkerIfNotRunning();

            this.attemptToRunFirstActionable().catch((error) => {
                if (
                    !(error instanceof RateLimitException) &&
                    !(error instanceof QueueException) &&
                    !(error instanceof ConsumeResult)
                ) {
                    Sentry.captureException(error);
                }
            })
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

        const readyIndex = this.queuedEntries.findIndex(entry => entry.notBefore <= Date.now());

        if (readyIndex === -1) {
            throw new QueueException('No ready items in queue')
        }

        const entry = this.queuedEntries.splice(readyIndex, 1)[0];

        try {
            const result = await entry.action();
            entry.resolve({status: 'fulfilled', value: result});
        } catch (error) {
            entry.retriesLeft--;

            if (entry.retriesLeft > 0) {
                entry.notBefore = Date.now() + this.retryDelayMs;
                this.queuedEntries.unshift(entry);
            } else {
                entry.resolve({status: 'rejected', reason: error as Error});
                Sentry.captureException(error);
            }
        }
    }

    private async attemptToRunAllJobs()
    {
        console.log('Attempting to run all jobs', this.queuedEntries.length)

        while (this.queuedEntries.length > 0) {
            try {
                await this.attemptToRunFirstActionable();
            } catch (error) {
                console.error(error)
                if (
                    !(error instanceof RateLimitException) &&
                    !(error instanceof QueueException) &&
                    !(error instanceof ConsumeResult)
                ) {
                    Sentry.captureException(error);
                }
                break
            }
        }
    }

    private async consumeRateLimit(limiter: RateLimiterMemory, rateLimiterKey: string): Promise<boolean | Error | ConsumeResult>
    {
        return new Promise((resolve) => {
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
                        !(error instanceof ConsumeResult)
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
