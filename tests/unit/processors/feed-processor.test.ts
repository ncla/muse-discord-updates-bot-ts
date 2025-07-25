import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {FeedProcessor, FetcherExecutionMode} from "@/src/processors/feed-processor";
import {UpdateType, WebhookService, WebhookServiceResponseMap, YoutubeUploadUpdate} from "@/src/updates";
import {UpdatesRepositoryKysely} from "@/src/repositories/updates-repository";
import {clearTestDatabase, createTestDatabase} from "@/tests/__utils__/database";
import {DiscordWebhookExecuteRequestor} from "@/src/webhook-requestor";
import {DoubleRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {YoutubeUploads} from "@/src/entry-fetchers/youtube-uploads";
import {createTestYoutubeUploadsEntry} from "@/tests/__utils__";
import {YoutubeUpload as YoutubeUploadsTransformer} from "@/src/updates/transformers/discord/youtube-upload";
import * as transformerExports from '@/src/updates/transformers'
import config from "@/src/config";
import {InsertableUpdateRecord, SelectableUpdateRecord} from "@/src/database";

const DB_FILE_IDENTIFIER = 'feed-processor'

beforeEach(async () => {
    await clearTestDatabase(DB_FILE_IDENTIFIER)
})

afterEach(async () => {
    await clearTestDatabase(DB_FILE_IDENTIFIER)
})

// Helper function to create a fetcher with a given number
const createTestFetcher = (
    num: number, 
    delayMs: number, 
    fetcherExecutionOrder: string[]
): YoutubeUploads => {
    const fetcher = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )

    fetcher.fetch = vi.fn(async (): Promise<YoutubeUploadUpdate[]> => {
        fetcherExecutionOrder.push(`fetcher${num}-start`)
        await new Promise(resolve => setTimeout(resolve, delayMs)) // Simulate delay
        fetcherExecutionOrder.push(`fetcher${num}-end`)
        const entry = createTestYoutubeUploadsEntry()
        entry.uniqueId = `fetcher${num}-entry`
        return [entry]
    })

    return fetcher
}

test('it processes with one of the fetchers throwing error', async () => {
    const db = await createTestDatabase(DB_FILE_IDENTIFIER)
    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WebhookService.Discord]>()

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

    const feedProcessor = new FeedProcessor<
        InsertableUpdateRecord,
        SelectableUpdateRecord,
        WebhookService.Discord
    >(
        WebhookService.Discord,
        [entryFetcherGood, entryFetcherFailing],
        updatesRepository,
        webhookRequestor,
        queueActionManager,
        FetcherExecutionMode.Parallel
    )

    expect(async () => {
        const processResult = await feedProcessor.process()

        const fetchersWithErrors = processResult.fetcherSummaries.filter(summary => summary.errors.length > 0)

        expect(requestorSpy).toHaveBeenCalledTimes(1)
        expect(fetchersWithErrors.length).toBe(1)
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
    const queueActionManager = new DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WebhookService.Discord]>()

    const entryFetcherGood = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )

    const fakeYoutubeUploadEntry = createTestYoutubeUploadsEntry()
    fakeYoutubeUploadEntry.uniqueId = FAKE_UNIQUE_ID

    entryFetcherGood.fetch = vi.fn(async () => {
        return <YoutubeUploadUpdate[]>[
            fakeYoutubeUploadEntry,
        ]
    })

    const updatesRepositoryFindSpy = vi.spyOn(updatesRepository, 'findByTypeAndUniqueId')
    const updatesRepositoryCreateSpy = vi.spyOn(updatesRepository, 'create')

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [entryFetcherGood],
        updatesRepository,
        webhookExecuteRequestor,
        queueActionManager,
        FetcherExecutionMode.Parallel
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
    const queueActionManager = new DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WebhookService.Discord]>()
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
        const entry = createTestYoutubeUploadsEntry()
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
        queueActionManager,
        FetcherExecutionMode.Parallel
    )

    await feedProcessor.process()

    expect(requestorSpy).toHaveBeenCalledTimes(4)
})

test('it sends webhook requests already before other entry fetchers have completed (parallel mode)', async () => {
    vi.useFakeTimers()

    const db = await createTestDatabase(DB_FILE_IDENTIFIER)
    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookExecuteRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WebhookService.Discord]>()

    let queueActionFinishTimestamps: number[] = []

    let entryId = 1

    const entryFetchersSlow = Array.from({length: 2}, () => {
        const fetcher = new YoutubeUploads(
            config.services.youtube.uploads_api_key,
            config.fetchables.youtube
        )

        const entries: YoutubeUploadUpdate[] = []

        for (let i = 0; i < 5; i++) {
            const entry = createTestYoutubeUploadsEntry()
            entry.uniqueId = `unique_id_${entryId}`
            entries.push(entry)
            entryId++
        }

        fetcher.fetch = vi.fn(async (): Promise<YoutubeUploadUpdate[]> => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(entries)
                }, 5000)
            })
        })

        return fetcher
    })

    const entryFetcherFast = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )

    entryFetcherFast.fetch = vi.fn(async () => {
        const entry = createTestYoutubeUploadsEntry()
        entry.uniqueId = `unique_id_1337`

        return [
            entry
        ]
    })

    const requestorSpy = vi
        .spyOn(webhookExecuteRequestor, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const originalQueue = queueActionManager.queue

    const queueSpy = vi
        .spyOn(queueActionManager, 'queue')
        .mockImplementation(async (...args) => {
            return originalQueue.apply(queueActionManager, args).then(result => {
                queueActionFinishTimestamps.push(+new Date())
                return result
            });
        })

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [...entryFetchersSlow, entryFetcherFast],
        updatesRepository,
        webhookExecuteRequestor,
        queueActionManager,
        FetcherExecutionMode.Parallel
    )

    const processPromise = feedProcessor.process()

    await vi.advanceTimersByTimeAsync(7000)

    await processPromise

    queueActionFinishTimestamps = queueActionFinishTimestamps.sort((a, b) => a - b)

    console.log(queueActionFinishTimestamps)

    expect(queueActionFinishTimestamps.length).toBe(11)
    expect(queueActionFinishTimestamps[1] - queueActionFinishTimestamps[0]).toBeGreaterThan(4900)
    expect(requestorSpy).toHaveBeenCalledTimes(11)
    expect(queueSpy).toHaveBeenCalledTimes(11)
    
    vi.useRealTimers()
})

test('it processes fetchers in parallel in parallel mode', async () => {
    vi.useFakeTimers()

    const fetcherExecutionOrder: string[] = []

    const fetcher1 = createTestFetcher(1, 1500, fetcherExecutionOrder)
    const fetcher2 = createTestFetcher(2, 500, fetcherExecutionOrder)
    const fetcher3 = createTestFetcher(3, 1000, fetcherExecutionOrder)

    const db = await createTestDatabase(DB_FILE_IDENTIFIER)
    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookExecuteRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WebhookService.Discord]>()

    const requestorSpy = vi
        .spyOn(webhookExecuteRequestor, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [fetcher1, fetcher2, fetcher3],
        updatesRepository,
        webhookExecuteRequestor,
        queueActionManager,
        FetcherExecutionMode.Parallel
    )

    const processPromise = feedProcessor.process()

    await vi.advanceTimersByTimeAsync(10)
    
    // All fetchers should have started immediately
    const startEvents = fetcherExecutionOrder.filter(event => event.includes('-start'))
    let endEvents = fetcherExecutionOrder.filter(event => event.includes('-end'))
    expect(startEvents.length).toBe(3)
    expect(endEvents.length).toBe(0)

    // Now advance time to let all fetchers complete
    await vi.advanceTimersByTimeAsync(1500)
    
    // Complete the process
    await processPromise
    
    // Check that all fetchers have completed
    endEvents = fetcherExecutionOrder.filter(event => event.includes('-end'))
    expect(endEvents.length).toBe(3)
    
    // Verify the expected execution order
    expect(fetcherExecutionOrder.indexOf('fetcher1-end')).toBeGreaterThan(fetcherExecutionOrder.indexOf('fetcher2-end'))
    expect(fetcherExecutionOrder.indexOf('fetcher2-end')).toBeLessThan(fetcherExecutionOrder.indexOf('fetcher3-end'))
    expect(fetcherExecutionOrder.indexOf('fetcher3-end')).toBeLessThan(fetcherExecutionOrder.indexOf('fetcher1-end'))

    expect(requestorSpy).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
})

test('it processes fetchers sequentially in sequential mode', async () => {
    vi.useFakeTimers()

    const db = await createTestDatabase(DB_FILE_IDENTIFIER)
    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookExecuteRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WebhookService.Discord]>()

    // Track the execution order of fetchers
    const fetcherExecutionOrder: string[] = []

    // Create three fetchers with different delays
    const fetcher1 = createTestFetcher(1, 2000, fetcherExecutionOrder)
    const fetcher2 = createTestFetcher(2, 1000, fetcherExecutionOrder)
    const fetcher3 = createTestFetcher(3, 1500, fetcherExecutionOrder)

    const requestorSpy = vi
        .spyOn(webhookExecuteRequestor, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [fetcher1, fetcher2, fetcher3],
        updatesRepository,
        webhookExecuteRequestor,
        queueActionManager,
        FetcherExecutionMode.Sequential
    )

    vi.advanceTimersByTimeAsync(5500)
    await feedProcessor.process()

    // In sequential mode, each fetcher should complete before the next one starts
    expect(fetcherExecutionOrder).toEqual([
        'fetcher1-start',
        'fetcher1-end',
        'fetcher2-start',
        'fetcher2-end',
        'fetcher3-start',
        'fetcher3-end'
    ])

    expect(requestorSpy).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
})

test('feed manager stops the queue worker interval', async () => {
    vi.useFakeTimers({
        now: new Date('2025-01-01T00:00:00Z')
    })

    const db = await createTestDatabase(DB_FILE_IDENTIFIER)
    const updatesRepository = new UpdatesRepositoryKysely(db)
    const webhookRequestor = new DiscordWebhookExecuteRequestor('fake', 'fake')
    const queueActionManager = new DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WebhookService.Discord]>()

    const entryFetcher = new YoutubeUploads(
        config.services.youtube.uploads_api_key,
        config.fetchables.youtube
    )

    entryFetcher.fetch = vi.fn(async () => {
        return <YoutubeUploadUpdate[]>[
            createTestYoutubeUploadsEntry(),
        ]
    })

    const requestorSendSpy = vi
        .spyOn(webhookRequestor, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const queueManagerStopWorkerSpy = vi
        .spyOn(queueActionManager, 'stopWorker')

    const feedProcessor = new FeedProcessor<
        InsertableUpdateRecord,
        SelectableUpdateRecord,
        WebhookService.Discord
    >(
        WebhookService.Discord,
        [entryFetcher],
        updatesRepository,
        webhookRequestor,
        queueActionManager,
        FetcherExecutionMode.Parallel
    )

    expect(async () => {
        const processResult = await feedProcessor.process()

        expect(processResult).toMatchSnapshot()

        expect(requestorSendSpy).toHaveBeenCalledTimes(1)
        expect(queueManagerStopWorkerSpy).toHaveBeenCalledTimes(1)
        expect(queueManagerStopWorkerSpy).toHaveReturnedWith(true)
    }).not.toThrow()

    vi.useRealTimers()
})
