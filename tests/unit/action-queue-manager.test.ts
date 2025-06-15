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

            // This is a bit primitive, but we are testing if time between sent actions is at least a second
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

    const manager = new DoubleRateLimitedActionableQueueManager(REQUEST_AMOUNT_PER_DURATION, RATE_LIMIT_DURATION)

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
            throw error
        })
        .finally(() => {
            vi.useRealTimers()
        })
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

            // Ensure no promises were rejected
            const rejectedPromises = result.filter((item) => item.status === 'rejected');
            expect(rejectedPromises.length).toBe(0);

            // Work with only fulfilled promises and map to value numbers
            const timestampValues = result
                .filter((item) => item.status === 'fulfilled')
                .map(item => item.value)

            // Ensure correct sort (from the oldest timestamp to newest)
            timestampValues.sort((a, b) => Number(a) - Number(b))

            const startTime = Number(timestampValues[0]);

            const groupedByTwoSecondInterval = groupTimestampsByInterval(timestampValues, 2, startTime)
            const groupedByMinuteInterval = groupTimestampsByInterval(timestampValues, 60, startTime)

            // console.dir(groupedByTwoSecondInterval, { depth: null });
            // console.dir(groupedByMinuteInterval, { depth: null })

            const groupedTwoSecondCounts = groupedByTwoSecondInterval.map((group) => group.length);
            const groupedMinuteCounts = groupedByMinuteInterval.map((group) => group.length);

            // console.log('Grouped by two-second intervals (item counts):', groupedTwoSecondCounts);
            // console.log('Grouped by minute intervals (item counts):', groupedMinuteCounts);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const timestampDebugTable = timestampValues.map((result) => {
                const date: Date = new Date(result);
                const timestamp = date.toISOString().substring(14, 19);

                return {
                    mmss: timestamp,
                    timestamp: result.toString().slice(-6)
                }
            })

            // console.table(timestampDebugTable)

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