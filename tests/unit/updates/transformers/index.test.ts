import {expect, test, vi} from 'vitest'
import {createBlankUpdate, Update, UpdateType, WebhookService} from "@/src/updates";
import {getBatchTransformer, getTransformer} from "@/src/updates/transformers";
import {YoutubeUpload as YoutubeUploadTransformer} from "@/src/updates/transformers/discord/youtube-upload";
import {MuseWikiChangeBatch} from "@/src/updates/transformers/discord/musewiki-change-batch";
import {createTestMuseWikiChangeEntry, createTestYoutubeUploadsEntry, repeatText} from "@/tests/__utils__";
import {APIEmbed, WebhookMessageCreateOptions} from 'discord.js';

test('youtube upload transformer gets selected for youtube uploads', async () => {
    const unprocessedUpdate: Update = {
        ...createBlankUpdate(),
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

    const unprocessedUpdate = createTestYoutubeUploadsEntry()

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

    const unprocessedUpdate = createTestYoutubeUploadsEntry()
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

test('description is omitted if not provided', async () => {
    vi.useFakeTimers({
        now: new Date('2025-01-01T00:00:00Z')
    })

    const unprocessedUpdate = createTestYoutubeUploadsEntry()
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

test('musewiki batch transformer is registered for musewiki changes', () => {
    const batchTransformer = getBatchTransformer(
        WebhookService.Discord,
        UpdateType.MUSEWIKI_CHANGE
    )

    expect(batchTransformer).toBeInstanceOf(MuseWikiChangeBatch)
})

test('no batch transformer is registered for youtube uploads', () => {
    const batchTransformer = getBatchTransformer(
        WebhookService.Discord,
        UpdateType.YOUTUBE_UPLOAD
    )

    expect(batchTransformer).toBeUndefined()
})

test('musewiki batch transformer produces a single embed listing all changes', () => {
    const updates = [
        createTestMuseWikiChangeEntry({
            uniqueId: '100-201',
            id: '201',
            title: 'Helsinki Kulttuuritalo 2025 (gig)',
            change_type: 'edit',
            user: 'Luigiman09',
            comment: 'price',
            pageid: 100,
            old_revid: 200,
            oldlen: 1719,
            newlen: 1728,
            created_at: new Date('2025-05-18T10:47:37Z'),
        }),
        createTestMuseWikiChangeEntry({
            uniqueId: '101-202',
            id: '202',
            title: 'Madrid Iberdrola Music 2025 (gig)',
            change_type: 'new',
            user: 'Luigiman09',
            comment: 'Created page with content',
            pageid: 101,
            old_revid: 0,
            oldlen: 0,
            newlen: 1677,
            created_at: new Date('2025-05-30T06:21:40Z'),
        }),
        createTestMuseWikiChangeEntry({
            uniqueId: '102-203',
            id: '203',
            title: 'File:Some image.jpg',
            change_type: 'log',
            user: 'Boombleeb',
            comment: null,
            pageid: 102,
            old_revid: 0,
            oldlen: 0,
            newlen: 0,
            created_at: new Date('2025-05-31T09:37:50Z'),
        }),
    ]

    const transformer = new MuseWikiChangeBatch()
    const result = transformer.transformBatch(updates)

    expect(result).toMatchSnapshot()
})

test('musewiki batch transformer truncates description when over 4096 chars', () => {
    const updates = []
    for (let i = 0; i < 200; i++) {
        updates.push(createTestMuseWikiChangeEntry({
            uniqueId: `${i}-${i}`,
            id: `${i}`,
            title: `Page Title Number ${i}`,
            user: `User${i}`,
            comment: repeatText('Comment text. ', 5),
            pageid: i,
            old_revid: i - 1,
            oldlen: 100,
            newlen: 150,
            created_at: new Date(`2025-01-01T00:${String(i % 60).padStart(2, '0')}:00Z`),
        }))
    }

    const transformer = new MuseWikiChangeBatch()
    const result = transformer.transformBatch(updates)

    expect(result.length).toBe(1)

    const firstEmbed = result[0].embeds?.[0] as { data: APIEmbed }
    const description = firstEmbed.data.description
    expect(description).toBeDefined()
    expect((description as string).length).toBeLessThanOrEqual(4096)
    expect(description as string).toContain('more')
})

test('musewiki batch transformer returns empty array for empty input', () => {
    const transformer = new MuseWikiChangeBatch()
    const result = transformer.transformBatch([])

    expect(result).toEqual([])
})