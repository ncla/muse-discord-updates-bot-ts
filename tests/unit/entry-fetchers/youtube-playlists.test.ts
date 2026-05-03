import {afterAll, afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {getTestConfig} from "@/tests/__utils__";
import {YoutubePlaylistVideos} from "@/src/entry-fetchers/youtube-playlists";
import {YoutubePlaylistsKysely} from "@/src/repositories/youtube-playlists-repository";
import {clearTestDatabase, createTestDatabase} from "@/tests/__utils__/database";
import {http, HttpResponse} from 'msw'
import {promises as fs} from "fs";
import path from "node:path";
import {server} from "@/tests/__utils__/msw-server";

const DB_FILE_IDENTIFIER = 'youtube-playlists'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(async () => {
    await clearTestDatabase(DB_FILE_IDENTIFIER)
})

afterEach(async () => {
    await clearTestDatabase(DB_FILE_IDENTIFIER)
})

test('it throws error on missing API key', async () => {
    const testConfig = await getTestConfig()
    const repository = new YoutubePlaylistsKysely(await createTestDatabase(DB_FILE_IDENTIFIER))

    testConfig.services.youtube.playlists_api_key = undefined

    const fetcher = new YoutubePlaylistVideos(
        repository,
        testConfig.services.youtube.playlists_api_key,
        testConfig.fetchables.youtube
    )

    await expect(fetcher.fetch()).rejects.toThrow('Youtube playlists API key is not set')
})

test('no playlists get fetched or queried when no channels are set to fetch playlists in config', async () => {
    const testConfig = await getTestConfig()
    const repository = new YoutubePlaylistsKysely(await createTestDatabase(DB_FILE_IDENTIFIER))

    const repositoryFindSpy = vi.spyOn(repository, 'findByPlaylistId')

    for (const channel of testConfig.fetchables.youtube) {
        channel.playlists = false
    }

    const fetcher = new YoutubePlaylistVideos(
        repository,
        testConfig.services.youtube.playlists_api_key,
        testConfig.fetchables.youtube
    )

    await fetcher.fetch()

    expect(repositoryFindSpy).toHaveBeenCalledTimes(0)
})

test('fetcher fails when playlists requests fails', async () => {
    const testConfig = await getTestConfig()
    const repository = new YoutubePlaylistsKysely(await createTestDatabase(DB_FILE_IDENTIFIER))

    testConfig.services.youtube.playlists_api_key = 'test'

    const fetcher = new YoutubePlaylistVideos(
        repository,
        testConfig.services.youtube.playlists_api_key,
        testConfig.fetchables.youtube
    )

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlists', () => {
            return HttpResponse.json(null, { status: 400, statusText: 'Bad Request' })
        })
    )

    await expect(fetcher.fetch()).rejects.toThrow('Response status: 400')
})

test('fetcher queries and creates playlists for new playlists', async () => {
    const testConfig = await getTestConfig()
    const repository = new YoutubePlaylistsKysely(await createTestDatabase(DB_FILE_IDENTIFIER))

    testConfig.services.youtube.playlists_api_key = 'test'

    const findByPlaylistIdSpy = vi.spyOn(repository, 'findByPlaylistId')
    const createSpy = vi.spyOn(repository, 'create')
    const updateSpy = vi.spyOn(repository, 'updateVideoCount')

    const fetcher = new YoutubePlaylistVideos(
        repository,
        testConfig.services.youtube.playlists_api_key,
        testConfig.fetchables.youtube
    )

    const playlistsJsonResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/muse-channel-playlists.json'),
        { encoding: 'utf-8' }
    ))

    const playlistItemsEmptyItems = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/playlist-items-empty.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlists', () => {
            return HttpResponse.json(playlistsJsonResponse, { status: 200, statusText: 'OK' })
        }),
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsEmptyItems, { status: 200, statusText: 'OK' })
        })
    )

    await fetcher.fetch()

    expect(findByPlaylistIdSpy).toHaveBeenCalledTimes(25)
    expect(createSpy).toHaveBeenCalledTimes(25)
    expect(updateSpy).toHaveBeenCalledTimes(0)
})

test('fetcher queries and updates playlist video count for existing playlist', async () => {
    const testConfig = await getTestConfig()
    const repository = new YoutubePlaylistsKysely(await createTestDatabase(DB_FILE_IDENTIFIER))

    testConfig.services.youtube.playlists_api_key = 'test'

    await repository.create({
        playlist_id: 'PLZ7vWQArY3hIsSWntEnk8v2a4lwEduxLh',
        video_count: 1,
    })

    const findByPlaylistIdSpy = vi.spyOn(repository, 'findByPlaylistId')
    const createSpy = vi.spyOn(repository, 'create')
    const updateSpy = vi.spyOn(repository, 'updateVideoCount')

    const fetcher = new YoutubePlaylistVideos(
        repository,
        testConfig.services.youtube.playlists_api_key,
        testConfig.fetchables.youtube
    )

    const playlistsJsonResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/muse-channel-playlists-single-item.json'),
        { encoding: 'utf-8' }
    ))

    const playlistItemsEmptyItems = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/playlist-items-empty.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlists', () => {
            return HttpResponse.json(playlistsJsonResponse, { status: 200, statusText: 'OK' })
        }),
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsEmptyItems, { status: 200, statusText: 'OK' })
        })
    )

    await fetcher.fetch()

    expect(findByPlaylistIdSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledTimes(0)
    expect(updateSpy).toHaveBeenCalledTimes(1)
})

test('fetcher queries but does not create or update playlists in database when no changes', async () => {
    const testConfig = await getTestConfig()
    const repository = new YoutubePlaylistsKysely(await createTestDatabase(DB_FILE_IDENTIFIER))

    testConfig.services.youtube.playlists_api_key = 'test'

    await repository.create({
        playlist_id: 'PLZ7vWQArY3hIsSWntEnk8v2a4lwEduxLh',
        video_count: 5,
    })

    await repository.create({
        playlist_id: 'PLZ7vWQArY3hKDJKX3G4uoKrNOYRXmva5R',
        video_count: 24,
    })

    const findByPlaylistIdSpy = vi.spyOn(repository, 'findByPlaylistId')
    const createSpy = vi.spyOn(repository, 'create')
    const updateSpy = vi.spyOn(repository, 'updateVideoCount')

    const fetcher = new YoutubePlaylistVideos(
        repository,
        testConfig.services.youtube.playlists_api_key,
        testConfig.fetchables.youtube
    )

    const playlistsJsonResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/muse-channel-playlists-two-items.json'),
        { encoding: 'utf-8' }
    ))

    const playlistItemsEmptyItems = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/playlist-items-empty.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlists', () => {
            return HttpResponse.json(playlistsJsonResponse, { status: 200, statusText: 'OK' })
        }),
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItemsEmptyItems, { status: 200, statusText: 'OK' })
        })
    )

    await fetcher.fetch()

    expect(findByPlaylistIdSpy).toHaveBeenCalledTimes(2)
    expect(createSpy).toHaveBeenCalledTimes(0)
    expect(updateSpy).toHaveBeenCalledTimes(0)
})

test('it fetches update entries', async () => {
    const testConfig = await getTestConfig()
    const repository = new YoutubePlaylistsKysely(await createTestDatabase(DB_FILE_IDENTIFIER))

    testConfig.services.youtube.playlists_api_key = 'test'

    const fetcher = new YoutubePlaylistVideos(
        repository,
        testConfig.services.youtube.playlists_api_key,
        testConfig.fetchables.youtube
    )

    const playlistsJsonResponse = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/muse-channel-playlists-single-item.json'),
        { encoding: 'utf-8' }
    ))

    const playlistItems = JSON.parse(await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/youtube-playlists/playlist-items-wotp-interstitial.json'),
        { encoding: 'utf-8' }
    ))

    server.use(
        http.get('https://www.googleapis.com/youtube/v3/playlists', () => {
            return HttpResponse.json(playlistsJsonResponse, { status: 200, statusText: 'OK' })
        }),
        http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
            return HttpResponse.json(playlistItems, { status: 200, statusText: 'OK' })
        })
    )

    const result = await fetcher.fetch()

    expect(result).toMatchSnapshot()
})
