import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";

beforeAll(() => {
    dotenv.config()
});

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