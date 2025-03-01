import {YoutubeUploads} from "@/src/entry-fetchers/youtube-uploads";
import {expect, test, vi, afterEach } from 'vitest'
import {getTestConfig} from "@/tests/__utils__";

afterEach(() => {
    vi.unstubAllGlobals()
})

test('fetches youtube uploads', async () => {
    vi.resetModules()

    const testConfig = await getTestConfig()

    const fetcher = new YoutubeUploads(
        testConfig.services.youtube.uploads_api_key,
        testConfig.fetchables.youtube
    )

    const fetchResult = await fetcher.fetch()

    expect(Array.isArray(fetchResult)).toBe(true)
    expect(fetchResult.length).toBe(25)
})

test('throws 400 HTTP error when incorrect API key is set', async () => {
    vi.resetModules()

    const testConfig = await getTestConfig()

    const fetcher = new YoutubeUploads(
        'incorrect',
        testConfig.fetchables.youtube
    )

    await expect(fetcher.fetch()).rejects.toThrow('Response status: 400')
})