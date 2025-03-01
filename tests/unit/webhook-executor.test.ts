import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";

beforeAll(() => {
    dotenv.config()
});

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