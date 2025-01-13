import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {FeedProcessor} from "../../src/processors/feed-processor";
import {UnprocessedUpdateEntry, UpdateType, WebhookService} from "../../src/update";
import {UpdatesRepositoryKysely} from "../../src/repositories/updates-repository";
import {clearTestDatabase, createTestDatabase} from "../__utils__/database";
import {DiscordWebhookRequestManager} from "../../src/request-manager";
import {YoutubeUploads} from "../../src/entry-fetchers/youtube-uploads";
import {createTestUnprocessedEntry} from "../__utils__";

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

    const entryFetcherGood = new YoutubeUploads()
    const entryFetcherFailing = new YoutubeUploads()

    entryFetcherGood.fetch = vi.fn(async () => {
        return <UnprocessedUpdateEntry[]>[
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