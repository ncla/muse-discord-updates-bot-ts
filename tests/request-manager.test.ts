import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookRequestManager} from "@/src/request-manager";

beforeAll(() => {
    dotenv.config()
});

test('it sends request to discord webhook endpoint', async () => {
    const realTestWebhookId = process.env.TEST_DISCORD_WEBHOOK_ID;
    const realTestWebhookToken = process.env.TEST_DISCORD_WEBHOOK_TOKEN;

    if (realTestWebhookId === undefined || realTestWebhookToken === undefined) {
        throw new Error('Missing test webhook ID or token')
    }

    const manager = new DiscordWebhookRequestManager(realTestWebhookId, realTestWebhookToken)

    const response = await manager.send({
        content: 'XD'
    })

    expect(response.status).toBe(204)
})

// TODO: alternatively, we could just mock the send method and check if it was called and note the timestamps
test('it sends multiple requests without hitting burst limit', async () => {
    const manager = new DiscordWebhookRequestManager('fake', 'fake')

    const REQUEST_AMOUNT = 12
    const REQUEST_AMOUNT_PER_DURATION = 5
    const RATE_LIMIT_DURATION = 1

    manager.send = vi.fn(() => {
        return Promise.resolve(new Response(null, {
            status: 204,
            statusText: (function() {
                return (+new Date()).toString()
            })(),
            headers: new Headers(),
        }))
    })

    const managerSpy = vi.spyOn(manager, 'send')

    for (let i = 0; i < REQUEST_AMOUNT; i++) {
        manager.add({
            content: i.toString()
        })
    }

    vi.useFakeTimers()
    vi.advanceTimersByTimeAsync(2000)

    return manager
        .sendAll(REQUEST_AMOUNT_PER_DURATION, RATE_LIMIT_DURATION)
        .then((result) => {
            const timestamps = result
                .filter((response) => {
                    return response.status === 'fulfilled'
                })
                .map((response) => {
                    return Number(response.value.statusText)
                })
                .sort()

            expect(Array.isArray((result))).toBe(true)
            expect(result.length).toBe(REQUEST_AMOUNT)
            expect(managerSpy).toHaveBeenCalledTimes(REQUEST_AMOUNT)

            // This is a bit primitive, but we are testing if time between requests is at least a second
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

test('request is tried three times', async () => {
    const manager = new DiscordWebhookRequestManager('fakeWebhookId', 'fakeWebhookToken')

    const REQUEST_AMOUNT = 1
    const REQUEST_AMOUNT_PER_DURATION = 5
    const RATE_LIMIT_DURATION = 1

    manager.send = vi.fn(() => {
        throw new Error('Fake error')
    })

    const managerSpy = vi.spyOn(manager, 'send')

    for (let i = 0; i < REQUEST_AMOUNT; i++) {
        manager.add({
            content: i.toString()
        })
    }

    vi.useFakeTimers()

    const beforeTime = +new Date()

    manager
        .sendAll(REQUEST_AMOUNT_PER_DURATION, RATE_LIMIT_DURATION)
        .then((result) => {
            expect(result.length).toBe(REQUEST_AMOUNT)
            expect(result[0].status).toBe('rejected')
        })

    await vi.advanceTimersByTimeAsync(2500)
    await vi.advanceTimersByTimeAsync(2500)

    const afterTime = +new Date()

    expect(afterTime - beforeTime).toBeGreaterThanOrEqual(5000)

    vi.useRealTimers()

    expect(managerSpy).toHaveBeenCalledTimes(3)
})

test('request with not OK status throws error', async () => {
    vi.stubGlobal('fetch', () => {
        return Promise.resolve({
            ok: false,
            statusText: 'Forbidden',
            json: () => Promise.resolve({})
        })
    })

    const manager = new DiscordWebhookRequestManager('fakeWebhookId', 'fakeWebhookToken')

    await expect(async () => {
        const response = await manager.send({
            content: 'XD'
        })
    }).rejects.toThrowError('Error: Forbidden')
})