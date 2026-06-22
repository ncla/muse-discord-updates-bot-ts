import {beforeAll, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";

beforeAll(() => {
    dotenv.config()
});

test('request with not OK status throws error', async () => {
    vi.stubGlobal('fetch', () => {
        return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            text: () => Promise.resolve(JSON.stringify({ message: 'Invalid Webhook Token', code: 50027 }))
        })
    })

    const requestor = new DiscordWebhookExecuteRequestor('fakeWebhookId', 'fakeWebhookToken')

    await expect(async () => {
        await requestor.send({
            content: 'XD'
        })
    }).rejects.toThrowError('Discord webhook request failed HTTP 403 Forbidden')
})