import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {FeedProcessor} from "../../src/processors/feed-processor";
import {Update, UpdateType, WebhookService} from "../../src/update";
import {UpdatesRepositoryKysely} from "../../src/repositories/updates-repository";
import {clearTestDatabase, createTestDatabase} from "../__utils__/database";
import {DiscordWebhookRequestManager} from "../../src/request-manager";
import {YoutubeUploads} from "../../src/entry-fetchers/youtube-uploads";
import {createTestUnprocessedEntry} from "../__utils__";
import {YoutubeUpload as YoutubeUploadsTransformer} from "../../src/updates/transformers/discord/youtube-upload";
import * as transformerExports from '../../src/updates/transformers/index'
import config from "../../src/config";

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
    const requestManager = new DiscordWebhookRequestManager('fake', 'fake')

    const entryFetcherGood = new YoutubeUploads(config)
    const entryFetcherFailing = new YoutubeUploads(config)

    entryFetcherGood.fetch = vi.fn(async () => {
        return <Update[]>[
            createTestUnprocessedEntry(UpdateType.YOUTUBE_UPLOAD),
        ]
    })

    entryFetcherFailing.fetch = vi.fn(async () => {
        throw new Error()
    })

    const requestManagerSendSpy = vi
        .spyOn(requestManager, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [entryFetcherGood, entryFetcherFailing],
        updatesRepository,
        requestManager
    )

    expect(async () => {
        await feedProcessor.process()
        expect(requestManagerSendSpy).toHaveBeenCalledTimes(1)
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
    const requestManager = new DiscordWebhookRequestManager('fake', 'fake')

    const entryFetcherGood = new YoutubeUploads(config)

    let fakeYoutubeUploadEntry = createTestUnprocessedEntry(UpdateType.YOUTUBE_UPLOAD)
    fakeYoutubeUploadEntry.uniqueId = FAKE_UNIQUE_ID

    entryFetcherGood.fetch = vi.fn(async () => {
        return <Update[]>[
            fakeYoutubeUploadEntry,
        ]
    })

    const requestManagerSendSpy = vi
        .spyOn(requestManager, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const updatesRepositoryFindSpy = vi.spyOn(updatesRepository, 'findByTypeAndUniqueId')
    const updatesRepositoryCreateSpy = vi.spyOn(updatesRepository, 'create')

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [entryFetcherGood],
        updatesRepository,
        requestManager
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
    const requestManager = new DiscordWebhookRequestManager('fake', 'fake')
    const entryFetcher = new YoutubeUploads(config)

    let getTransformerCallCount = 0;

    // This could be any other method that returns error, we just need to test that the feed process continues
    vi.spyOn(transformerExports, 'getTransformer').mockImplementation(() => {
        if (getTransformerCallCount === 2) {
            getTransformerCallCount++
            throw new Error('xD')
        }

        getTransformerCallCount++
        return new YoutubeUploadsTransformer
    })

    const entries: Update[] = []

    for (let i = 0; i < 5; i++) {
        let entry = createTestUnprocessedEntry(UpdateType.YOUTUBE_UPLOAD)
        entry.uniqueId = `unique_id_${i}`
        entries.push(entry)
    }

    entryFetcher.fetch = vi.fn(async () => {
        return entries
    })

    const requestManagerSendSpy = vi
        .spyOn(requestManager, 'send')
        .mockImplementation(async () => {
            return new Response()
        })

    const feedProcessor = new FeedProcessor(
        WebhookService.Discord,
        [entryFetcher],
        updatesRepository,
        requestManager
    )

    await feedProcessor.process()

    expect(requestManagerSendSpy).toHaveBeenCalledTimes(4)
})