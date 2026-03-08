import {beforeAll, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DoubleRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {groupTimestampsByInterval} from "@/tests/__utils__";

beforeAll(() => {
    dotenv.config()
});

test('it calls action without hitting burst rate limit', async () => {
    const REQUEST_AMOUNT = 12
    const REQUEST_AMOUNT_PER_DURATION = 5
    const RATE_LIMIT_DURATION = 1

    const manager = new DoubleRateLimitedActionableQueueManager(REQUEST_AMOUNT_PER_DURATION, RATE_LIMIT_DURATION)

    vi.useFakeTimers()
    vi.advanceTimersByTimeAsync(2000)

    const promises = []

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

            expect(timestamps[5] - timestamps[0]).toBeGreaterThanOrEqual(RATE_LIMIT_DURATION * 1000)
            expect(timestamps[10] - timestamps[5]).toBeGreaterThanOrEqual(RATE_LIMIT_DURATION * 1000)
        })
        .catch((error) => {
            throw error
        })
        .finally(() => {
            vi.useRealTimers()
        })
})

test('action is tried three times till it is rejected', async () => {
    const REQUEST_AMOUNT = 1
    const REQUEST_AMOUNT_PER_DURATION = 5
    const RATE_LIMIT_DURATION = 1
    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 2500

    const manager = new DoubleRateLimitedActionableQueueManager(
        REQUEST_AMOUNT_PER_DURATION,
        RATE_LIMIT_DURATION,
        30,
        60,
        MAX_RETRIES,
        RETRY_DELAY_MS
    )

    const actionFunction = vi.fn(() => {
        return Promise.reject(new Error('Fake error'))
    })

    vi.useFakeTimers()

    const beforeTime = +new Date()

    const promises = []

    for (let i = 0; i < REQUEST_AMOUNT; i++) {
        promises.push(
            manager.queue(actionFunction)
        )
    }

    // First attempt happens immediately on queue().
    // Each retry needs the 2500ms backoff to elapse, then the next worker tick (1000ms interval) to pick it up.
    // Advance enough time for all retries to complete.
    await vi.advanceTimersByTimeAsync(3000)
    await vi.advanceTimersByTimeAsync(3000)

    return Promise
        .all(promises)
        .then((result) => {
            expect(result.length).toBe(REQUEST_AMOUNT)
            expect(result[0].status).toBe('rejected')

            const afterTime = +new Date()
            expect(afterTime - beforeTime).toBeGreaterThanOrEqual(2 * RETRY_DELAY_MS)
            expect(actionFunction).toHaveBeenCalledTimes(MAX_RETRIES)
        })
        .catch((error) => {
            throw error
        })
        .finally(() => {
            vi.useRealTimers()
        })
})

test('retries consume rate limit points', async () => {
    const REQUEST_AMOUNT_PER_DURATION = 5
    const RATE_LIMIT_DURATION = 2
    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 500

    const manager = new DoubleRateLimitedActionableQueueManager(
        REQUEST_AMOUNT_PER_DURATION,
        RATE_LIMIT_DURATION,
        30,
        60,
        MAX_RETRIES,
        RETRY_DELAY_MS
    )

    vi.useFakeTimers()

    const callOrder: string[] = []

    const failingAction = vi.fn(() => {
        callOrder.push('failing')
        return Promise.reject(new Error('Fake error'))
    })

    const successAction = vi.fn(() => {
        callOrder.push('success')
        return Promise.resolve(+new Date())
    })

    const failingPromise = manager.queue(failingAction)

    const successPromises = []
    for (let i = 0; i < 4; i++) {
        successPromises.push(manager.queue(successAction))
    }

    await vi.advanceTimersByTimeAsync(10000)

    const failResult = await failingPromise
    await Promise.all(successPromises)

    expect(failResult.status).toBe('rejected')
    expect(failingAction).toHaveBeenCalledTimes(MAX_RETRIES)
    expect(successAction).toHaveBeenCalledTimes(4)

    // The failing action's retries should be interleaved with or delay the success actions,
    // because they all compete for rate limit points
    expect(callOrder.length).toBe(7) // 3 failing + 4 success

    vi.useRealTimers()
})

test('failed action retries are inserted at front of queue', async () => {
    const MAX_RETRIES = 2
    const RETRY_DELAY_MS = 100

    const manager = new DoubleRateLimitedActionableQueueManager(
        10,
        1,
        30,
        60,
        MAX_RETRIES,
        RETRY_DELAY_MS
    )

    vi.useFakeTimers()

    const callOrder: string[] = []
    let failOnce = true

    const flakyAction = vi.fn(() => {
        callOrder.push('flaky')
        if (failOnce) {
            failOnce = false
            return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve('recovered')
    })

    const secondAction = vi.fn(() => {
        callOrder.push('second')
        return Promise.resolve('second-result')
    })

    const flakyPromise = manager.queue(flakyAction)
    const secondPromise = manager.queue(secondAction)

    await vi.advanceTimersByTimeAsync(5000)

    const flakyResult = await flakyPromise
    const secondResult = await secondPromise

    expect(flakyResult.status).toBe('fulfilled')
    expect(secondResult.status).toBe('fulfilled')
    expect(flakyAction).toHaveBeenCalledTimes(2)

    // The secondAction runs while flakyAction waits for its backoff delay,
    // then the retry of flakyAction executes after the backoff elapses
    expect(callOrder).toEqual(['flaky', 'second', 'flaky'])

    vi.useRealTimers()
})

test('actions are rate limited by short term rate limit (5 requets/2 seconds) and long term rate limit (30 requests/60 seconds)', async () => {
    const REQUEST_AMOUNT = 40
    const SHORT_TERM_RATELIMIT_REQUEST_AMOUNT_PER_DURATION = 5
    const SHORT_TERM_RATE_LIMIT_DURATION = 2
    const LONG_TERM_RATELIMIT_REQUEST_AMOUNT_PER_DURATION = 30
    const LONG_TERM_RATE_LIMIT_DURATION = 60

    const manager = new DoubleRateLimitedActionableQueueManager<number>(
        SHORT_TERM_RATELIMIT_REQUEST_AMOUNT_PER_DURATION,
        SHORT_TERM_RATE_LIMIT_DURATION,
        LONG_TERM_RATELIMIT_REQUEST_AMOUNT_PER_DURATION,
        LONG_TERM_RATE_LIMIT_DURATION
    )

    const actionFunction = vi.fn(() => {
        return Promise.resolve(+new Date())
    })

    vi.useFakeTimers()

    const promises = []

    for (let i = 0; i < REQUEST_AMOUNT; i++) {
        promises.push(
            manager.queue(actionFunction)
        )
    }

    await vi.advanceTimersByTimeAsync(64 * 2500)

    return Promise
        .all(promises)
        .then((result) => {
            expect(result.length).toBe(REQUEST_AMOUNT)
            expect(result[0].status).toBe('fulfilled')
            expect(actionFunction).toHaveBeenCalledTimes(REQUEST_AMOUNT)

            const rejectedPromises = result.filter((item) => item.status === 'rejected');
            expect(rejectedPromises.length).toBe(0);

            const timestampValues = result
                .filter((item) => item.status === 'fulfilled')
                .map(item => item.value)

            timestampValues.sort((a, b) => Number(a) - Number(b))

            const startTime = Number(timestampValues[0]);

            const groupedByTwoSecondInterval = groupTimestampsByInterval(timestampValues, 2, startTime)
            const groupedByMinuteInterval = groupTimestampsByInterval(timestampValues, 60, startTime)

            const groupedTwoSecondCounts = groupedByTwoSecondInterval.map((group) => group.length);
            const groupedMinuteCounts = groupedByMinuteInterval.map((group) => group.length);

            expect(groupedMinuteCounts[0]).toBe(30)
            expect(groupedMinuteCounts[1]).toBe(10)

            expect(groupedTwoSecondCounts[30]).toBe(5)
            expect(groupedTwoSecondCounts[31]).toBe(5)
        })
        .catch((error) => {
            throw error
        })
        .finally(() => {
            vi.useRealTimers()
        })
})
