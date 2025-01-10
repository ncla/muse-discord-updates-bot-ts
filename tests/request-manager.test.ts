import {beforeAll, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookRequestManager} from "../src/request-manager";

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

    const result = await manager.sendAll(REQUEST_AMOUNT_PER_DURATION, RATE_LIMIT_DURATION)

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

test.todo('failing requests are retried up to 3 times')