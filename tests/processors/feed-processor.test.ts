import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {FeedProcessor} from "@/src/processors/feed-processor";
import {UpdateType, WebhookService, YoutubeUploadUpdate} from "@/src/updates";
import {UpdatesRepositoryKysely} from "@/src/repositories/updates-repository";
import {clearTestDatabase, createTestDatabase} from "@/tests/__utils__/database";
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";
import {FixedWindowRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {YoutubeUploads} from "@/src/entry-fetchers/youtube-uploads";
import {createTestYoutubeUploadsEntry} from "@/tests/__utils__";
import {YoutubeUpload as YoutubeUploadsTransformer} from "@/src/updates/transformers/discord/youtube-upload";
import * as transformerExports from '@/src/updates/transformers/index'
import config from "@/src/config";

const DB_FILE_IDENTIFIER = 'feed-processor'

beforeEach(async () => {
    await clearTestDatabase(DB_FILE_IDENTIFIER)
})

afterEach(async () => {
    await clearTestDatabase(DB_FILE_IDENTIFIER)
})

test('it processes with one of the fetchers throwing error', async () => {
    const db = await createTestDatabase(DB_FILE_IDENTIFIER)
    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new FixedWindowRateLimitedActionableQueueManager()

    const entryFetcherGood = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )
    const entryFetcherFailing = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )

    entryFetcherGood.fetch = vi.fn(async () => {
        return <YoutubeUploadUpdate[]>[
            createTestYoutubeUploadsEntry(),
        ]
    })

    entryFetcherFailing.fetch = vi.fn(async () => {
        throw new Error('Fake error')
    })

    const requestorSpy = vi
        .spyOn(webhookRequestor, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [entryFetcherGood, entryFetcherFailing],
        updatesRepository,
        webhookRequestor,
        queueActionManager
    )

    expect(async () => {
        await feedProcessor.process()
        expect(requestorSpy).toHaveBeenCalledTimes(1)
    }).not.toThrow()
})

test('insert query is not run when entry already exists', async () => {
    const FAKE_UNIQUE_ID = 'fake_unique_id';

    const db = await createTestDatabase(DB_FILE_IDENTIFIER)

    await db
        .insertInto('updates')
        .values({
            type: UpdateType.YOUTUBE_UPLOAD,
            unique_id: FAKE_UNIQUE_ID
        })
        .executeTakeFirst()

    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookExecuteRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new FixedWindowRateLimitedActionableQueueManager()

    const entryFetcherGood = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )

    let fakeYoutubeUploadEntry = createTestYoutubeUploadsEntry()
    fakeYoutubeUploadEntry.uniqueId = FAKE_UNIQUE_ID

    entryFetcherGood.fetch = vi.fn(async () => {
        return <YoutubeUploadUpdate[]>[
            fakeYoutubeUploadEntry,
        ]
    })

    const requestManagerSendSpy = vi
        .spyOn(webhookExecuteRequestor, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const updatesRepositoryFindSpy = vi.spyOn(updatesRepository, 'findByTypeAndUniqueId')
    const updatesRepositoryCreateSpy = vi.spyOn(updatesRepository, 'create')

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [entryFetcherGood],
        updatesRepository,
        webhookExecuteRequestor,
        queueActionManager
    )

    await feedProcessor.process()

    expect(updatesRepositoryFindSpy).toHaveBeenCalledTimes(1)
    expect(updatesRepositoryCreateSpy).toHaveBeenCalledTimes(0)

    const rows = await db
        .selectFrom('updates')
        .selectAll()
        .execute()

    expect(rows.length).toBe(1)
})

test('it processes fetched entries in a loop without one entry failing entire process', async () => {
    const db = await createTestDatabase(DB_FILE_IDENTIFIER)

    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookExecuteRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new FixedWindowRateLimitedActionableQueueManager()
    const entryFetcher = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )

    let getTransformerCallCount = 0;

    // This could be any other method that returns error, we just need to test that the feed process continues
    // TODO: Try actually passing invalid value to getTransformer. This is kinda poopy.
    vi.spyOn(transformerExports, 'getTransformer').mockImplementation(() => {
        if (getTransformerCallCount === 2) {
            getTransformerCallCount++
            throw new Error('xD')
        }

        getTransformerCallCount++
        return new YoutubeUploadsTransformer
    })

    const entries: YoutubeUploadUpdate[] = []

    for (let i = 0; i < 5; i++) {
        let entry = createTestYoutubeUploadsEntry()
        entry.uniqueId = `unique_id_${i}`
        entries.push(entry)
    }

    entryFetcher.fetch = vi.fn(async () => {
        return entries
    })

    const requestorSpy = vi
        .spyOn(webhookExecuteRequestor, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [entryFetcher],
        updatesRepository,
        webhookExecuteRequestor,
        queueActionManager
    )

    await feedProcessor.process()

    expect(requestorSpy).toHaveBeenCalledTimes(4)
})