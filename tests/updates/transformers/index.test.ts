import {expect, test, vi} from 'vitest'
import {createBlankUnprocessedUpdate, Update, UpdateType, WebhookService} from "@/src/update";
import {getTransformer} from "@/src/updates/transformers";
import {YoutubeUpload as YoutubeUploadTransformer} from "@/src/updates/transformers/discord/youtube-upload";
import {createTestUnprocessedEntry, repeatText} from "@/tests/__utils__";
import {setNestedProperty} from "@/src/common";
import {APIEmbed, WebhookMessageCreateOptions} from 'discord.js';

test('youtube upload transformer gets selected for youtube uploads', async () => {
    const unprocessedUpdate: Update = {
        ...createBlankUnprocessedUpdate(),
        type: UpdateType.YOUTUBE_UPLOAD,
        uniqueId: 'test',
        id: 'test',
    }

    const transformer = getTransformer(
        WebhookService.Discord,
        unprocessedUpdate.type
    )

    expect(transformer).toBeInstanceOf(YoutubeUploadTransformer)
})

test('youtube upload entry is transformed to discord webhook message options', async () => {
    vi.useFakeTimers({
        now: new Date('2025-01-01T00:00:00Z')
    })

    const unprocessedUpdate = createTestUnprocessedEntry()

    const transformer = getTransformer(
        WebhookService.Discord,
        unprocessedUpdate.type
    )

    const processedUpdate = transformer.transform(unprocessedUpdate)

    expect(processedUpdate).toMatchSnapshot()

    vi.useRealTimers()
})

test('youtube upload title and description is truncated', async () => {
    vi.useFakeTimers({
        now: new Date('2025-01-01T00:00:00Z')
    })

    let unprocessedUpdate = createTestUnprocessedEntry()
    unprocessedUpdate.title = repeatText('A', 300)
    unprocessedUpdate.content = repeatText('A', 1050)

    const transformer = getTransformer(
        WebhookService.Discord,
        unprocessedUpdate.type
    )

    const processedUpdate = transformer.transform(unprocessedUpdate)

    expect(processedUpdate).toMatchSnapshot()

    vi.useRealTimers()
})

test('youtube upload transformer fails on undefined or null update entry fields', async () => {
    vi.useFakeTimers({
        now: new Date('2025-01-01T00:00:00Z')
    })

    const unprocessedUpdate = createTestUnprocessedEntry()

    const transformer = getTransformer(
        WebhookService.Discord,
        unprocessedUpdate.type
    )

    const fieldsToTest = [
        'title',
        'url',
        'image_url',
        'author',
        'author.name',
        'author.image_url',
        'created_at',
    ]

    for (const field of fieldsToTest) {
        let unprocessedUpdateCopy = {...unprocessedUpdate}

        setNestedProperty(unprocessedUpdateCopy, field, null)

        expect(() => {
            transformer.transform(unprocessedUpdateCopy)
        }).toThrowError('Missing required fields for YouTube upload')

        unprocessedUpdateCopy = {...unprocessedUpdate}

        setNestedProperty(unprocessedUpdateCopy, field, undefined)

        expect(() => {
            transformer.transform(unprocessedUpdateCopy)
        }).toThrowError('Missing required fields for YouTube upload')
    }

    vi.useRealTimers()
})

test('description is omitted if not provided', async () => {
    vi.useFakeTimers({
        now: new Date('2025-01-01T00:00:00Z')
    })

    let unprocessedUpdate = createTestUnprocessedEntry()
    unprocessedUpdate.content = ''

    const transformer = getTransformer(
        WebhookService.Discord,
        unprocessedUpdate.type
    )

    const result = transformer.transform(unprocessedUpdate) as WebhookMessageCreateOptions

    // Make Typescript happy
    if (!result.embeds) {
        throw new Error('Expected embeds to be defined')
    }

    const firstEmbed = result.embeds[0] as APIEmbed

    expect(firstEmbed.description).toBeUndefined()

    vi.useRealTimers()
})