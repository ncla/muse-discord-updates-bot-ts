import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";

beforeAll(() => {
    dotenv.config()
});

// TODO: this is E2E test, should be moved to e2e folder
test('it sends request to discord webhook endpoint', async () => {
    const realTestWebhookId = process.env.TEST_DISCORD_WEBHOOK_ID;
    const realTestWebhookToken = process.env.TEST_DISCORD_WEBHOOK_TOKEN;

    if (realTestWebhookId === undefined || realTestWebhookToken === undefined) {
        throw new Error('Missing test webhook ID or token')
    }

    const manager = new DiscordWebhookExecuteRequestor(realTestWebhookId, realTestWebhookToken)

    const response = await manager.send({
        content: 'XD'
    })

    expect(response.status).toBe(204)
})

test('request with not OK status throws error', async () => {
    vi.stubGlobal('fetch', () => {
        return Promise.resolve({
            ok: false,
            statusText: 'Forbidden',
            json: () => Promise.resolve({})
        })
    })

    const requestor = new DiscordWebhookExecuteRequestor('fakeWebhookId', 'fakeWebhookToken')

    await expect(async () => {
        const response = await requestor.send({
            content: 'XD'
        })
    }).rejects.toThrowError('Error: Forbidden')
})