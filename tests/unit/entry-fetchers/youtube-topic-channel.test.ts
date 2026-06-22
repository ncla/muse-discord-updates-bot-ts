import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import {getTestConfig} from "@/tests/__utils__";
import {YoutubeTopicChannel} from "@/src/entry-fetchers/youtube-topic-channel";
import {http, HttpResponse} from 'msw'
import {promises as fs} from "fs";
import path from "node:path";
import {UpdateType} from "@/src/updates";
import {server} from "@/tests/__utils__/msw-server";

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

afterEach(() => {
    vi.unstubAllGlobals()
})

test('throws error when no API key is set', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        undefined,
        testConfig.fetchables.youtube_topic_channels
    )

    await expect(fetcher.fetch()).rejects.toThrow('Youtube API key is not set')
})

test('returns empty array when fetchables is empty array', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        []
    )

    const result = await fetcher.fetch()

    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
})

test('fetcher fails when playlistItems request fails', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(null, { status: 400, statusText: 'Bad Request' })
        })
    )

    await expect(fetcher.fetch()).rejects.toThrow('YouTube topic channel request failed HTTP 400')
})

test('content is null when no description is provided for video', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    const playlistItemsResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-no-description.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsResponse, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(result[0].content).toBeNull()
})

test('content is set when description is provided', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    const playlistItemsResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-single.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsResponse, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(result[0].content).toContain('Provided to YouTube by WM UK')
})

test('uses highest resolution thumbnail available (maxres)', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    const playlistItemsResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-single.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsResponse, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe('https://i.ytimg.com/vi/5OLADD9TArY/maxresdefault.jpg')
})

test('uses default thumbnail if only default is present', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    const playlistItemsResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-default-thumbnail-only.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsResponse, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe('https://i.ytimg.com/vi/5OLADD9TArY/default.jpg')
})

test('fetches all pages when pagination is present', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    const page1Response = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-page1.json'),
        { encoding: 'utf-8' }
    ))

    const page2Response = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-page2.json'),
        { encoding: 'utf-8' }
    ))

    let requestCount = 0

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', ({ request }) => {
            requestCount++
            const url = new URL(request.url)
            const pageToken = url.searchParams.get('pageToken')

            if (pageToken === 'EAAaHlBUOkNBSWlFRU5HTWpFeE1USkJPRGd6T0RWQlF6WQ') {
                return HttpResponse.json(page2Response, { status: 200, statusText: 'OK' })
            }

            return HttpResponse.json(page1Response, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(requestCount).toBe(2)
    expect(result).toHaveLength(4)
    expect(result[0].title).toBe('Resistance (Tiësto Remix)')
    expect(result[1].title).toBe('Resistance (Radio Edit)')
    expect(result[2].title).toBe('Resistance')
    expect(result[3].title).toBe('Supremacy (Live @ Koln)')
})

test('it fetches update entries with correct structure', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    const playlistItemsResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-single.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsResponse, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(result).toHaveLength(1)

    const entry = result[0]
    expect(entry.type).toBe(UpdateType.YOUTUBE_TOPIC_VIDEO)
    expect(entry.uniqueId).toBe('topic_UCw8jIQzB2mdvvo_CVplLxug_5OLADD9TArY')
    expect(entry.id).toBe('5OLADD9TArY')
    expect(entry.title).toBe('Resistance (Tiësto Remix)')
    expect(entry.url).toBe('https://www.youtube.com/watch?v=5OLADD9TArY')
    expect(entry.author.id).toBe('UCw8jIQzB2mdvvo_CVplLxug')
    expect(entry.author.name).toBe('Muse - Topic')
    expect(entry.created_at).toEqual(new Date('2025-08-23T03:51:44Z'))
})

test('returns empty array when playlist has no items', async () => {
    const testConfig = await getTestConfig()

    const fetcher = new YoutubeTopicChannel(
        'test-api-key',
        testConfig.fetchables.youtube_topic_channels
    )

    const playlistItemsResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-topic-channel/playlist-items-empty.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsResponse, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(result).toEqual([])
})
