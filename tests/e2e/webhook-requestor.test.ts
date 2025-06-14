import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import dotenv from 'dotenv'
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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

test('it sends image attachment from file path to discord webhook endpoint', async () => {
    const realTestWebhookId = process.env.TEST_DISCORD_WEBHOOK_ID;
    const realTestWebhookToken = process.env.TEST_DISCORD_WEBHOOK_TOKEN;

    if (realTestWebhookId === undefined || realTestWebhookToken === undefined) {
        throw new Error('Missing test webhook ID or token')
    }

    const tempDir = path.join(os.tmpdir(), 'muse-discord-bot-test')
    await fs.mkdir(tempDir, { recursive: true })
    
    const testImagePath = path.join(tempDir, 'test-image.jpg')
    
    const imageUrl = 'https://fastly.picsum.photos/id/1/200/300.jpg?hmac=jH5bDkLr6Tgy3oAg5khKCHeunZMHq0ehBZr6vGifPLY'
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
        throw new Error(`Failed to fetch test image: ${response.statusText}`)
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(testImagePath, imageBuffer)

    try {
        const requestSender = new DiscordWebhookExecuteRequestor(realTestWebhookId, realTestWebhookToken)

        const response = await requestSender.send({
            content: 'Test image upload from file path',
            embeds: [{
                title: 'Test Embed with Image',
                image: {
                    url: 'attachment://test-image.jpg'
                }
            }],
            files: [{
                attachment: testImagePath,
                name: 'test-image.jpg'
            }]
        })

        expect([200, 204]).toContain(response.status)
    } finally {
        try {
            await fs.unlink(testImagePath)
            await fs.rmdir(tempDir)
        } catch (error) {
            console.warn('Failed to cleanup test files:', error)
        }
    }
})