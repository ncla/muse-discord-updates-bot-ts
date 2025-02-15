import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";
import {FixedWindowRateLimitedActionableQueueManager} from "@/src/action-queue-manager";

beforeAll(() => {
    dotenv.config()
});

test('it calls action without hitting burst limit', async () => {
    const REQUEST_AMOUNT = 12
    const REQUEST_AMOUNT_PER_DURATION = 5
    const RATE_LIMIT_DURATION = 1

    const manager = new FixedWindowRateLimitedActionableQueueManager(REQUEST_AMOUNT_PER_DURATION, RATE_LIMIT_DURATION)

    vi.useFakeTimers()
    vi.advanceTimersByTimeAsync(2000)

    let promises = []

    const actionFunction = vi.fn(() => {
        return Promise.resolve(+new Date())
    })

    for (let i = 0; i < REQUEST_AMOUNT; i++) {
        promises.push(
            manager.queue(actionFunction)
        )
    }

    return Promise
        .all(promises)
        .then((result) => {
            const timestamps = result
                .filter((result) => {
                    return result.status === 'fulfilled'
                })
                .map((result) => {
                    return Number(result.value)
                })
                .sort()

            expect(Array.isArray((result))).toBe(true)
            expect(result.length).toBe(REQUEST_AMOUNT)
            expect(actionFunction).toHaveBeenCalledTimes(REQUEST_AMOUNT)

            // This is a bit primitive, but we are testing if time between sent actions is at least a second
            expect(timestamps[5] - timestamps[0]).toBeGreaterThanOrEqual(RATE_LIMIT_DURATION * 1000)
            expect(timestamps[10] - timestamps[5]).toBeGreaterThanOrEqual(RATE_LIMIT_DURATION * 1000)
        })
        .catch((error) => {
            console.error(error)
        })
        .finally(() => {
            vi.useRealTimers()
        })
})

test('action is tried three times till it is rejected', async () => {
    const REQUEST_AMOUNT = 1
    const REQUEST_AMOUNT_PER_DURATION = 5
    const RATE_LIMIT_DURATION = 1

    const manager = new FixedWindowRateLimitedActionableQueueManager(REQUEST_AMOUNT_PER_DURATION, RATE_LIMIT_DURATION)

    const actionFunction = vi.fn(() => {
        return Promise.reject(new Error('Fake error'))
    })

    vi.useFakeTimers()

    const beforeTime = +new Date()

    let promises = []

    for (let i = 0; i < REQUEST_AMOUNT; i++) {
        promises.push(
            manager.queue(actionFunction)
        )
    }

    await vi.advanceTimersByTimeAsync(2500)
    await vi.advanceTimersByTimeAsync(2500)

    return Promise
        .all(promises)
        .then((result) => {
            expect(result.length).toBe(REQUEST_AMOUNT)
            expect(result[0].status).toBe('rejected')

            const afterTime = +new Date()
            expect(afterTime - beforeTime).toBeGreaterThanOrEqual(5000)
            expect(actionFunction).toHaveBeenCalledTimes(3)
        })
        .catch((error) => {
            console.error(error)
        })
        .finally(() => {
            vi.useRealTimers()
        })
})
