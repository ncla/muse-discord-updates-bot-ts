import {YoutubeUploads} from "@/src/entry-fetchers/youtube-uploads";
import {expect, test, vi, afterEach } from 'vitest'
import {getTestConfig} from "@/tests/__utils__";

afterEach(() => {
    vi.unstubAllGlobals()
})

test('throws error when no API key is set', async () => {
    vi.resetModules()

    const testConfig = await getTestConfig()

    const fetcher = new YoutubeUploads(
        undefined,
        testConfig.fetchables.youtube
    )
    await expect(fetcher.fetch()).rejects.toThrow()
})

test('content is null when no description is provided for video', async () => {
    const testConfig = await getTestConfig()

    vi.stubGlobal('fetch', () => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                items: [
                    {
                        snippet: {
                            resourceId: {
                                videoId: 'videoId'
                            },
                            title: 'title',
                            description: '',
                            thumbnails: {
                                standard: {
                                    url: 'url'
                                }
                            }
                        }
                    }
                ]
            })
        })
    })

    const fetcher = new YoutubeUploads(
        testConfig.services.youtube.uploads_api_key,
        testConfig.fetchables.youtube
    )
    const result = await fetcher.fetch()

    expect(result[0].content).toBeNull()
})

test('content is set when description is provided', async () => {
    const DESCRIPTION = 'Description :)'

    const testConfig = await getTestConfig()

    vi.stubGlobal('fetch', () => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                items: [
                    {
                        snippet: {
                            resourceId: {
                                videoId: 'videoId'
                            },
                            title: 'title',
                            description: DESCRIPTION,
                            thumbnails: {
                                standard: {
                                    url: 'url'
                                }
                            }
                        }
                    }
                ]
            })
        })
    })

    const fetcher = new YoutubeUploads(
        testConfig.services.youtube.uploads_api_key,
        testConfig.fetchables.youtube
    )
    const result = await fetcher.fetch()

    expect(result[0].content).toBe(DESCRIPTION)
})

test('uses standard thumbnail if it is provided', async () => {
    const STANDARD_THUMBNAIL_URL = 'https://thumbnail.com/standard.jpg'
    const DEFAULT_THUMBNAIL_URL = 'https://thumbnail.com/default.jpg'

    const testConfig = await getTestConfig()

    vi.stubGlobal('fetch', () => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                items: [
                    {
                        snippet: {
                            resourceId: {
                                videoId: 'videoId'
                            },
                            title: 'title',
                            description: '',
                            thumbnails: {
                                default: {
                                    url: DEFAULT_THUMBNAIL_URL
                                },
                                standard: {
                                    url: STANDARD_THUMBNAIL_URL
                                },
                            }
                        }
                    }
                ]
            })
        })
    })

    const fetcher = new YoutubeUploads(
        testConfig.services.youtube.uploads_api_key,
        testConfig.fetchables.youtube
    )
    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe(STANDARD_THUMBNAIL_URL)
})

test('uses default thumbnail if standard is not present', async () => {
    const DEFAULT_THUMBNAIL_URL = 'https://thumbnail.com/default.jpg'

    const testConfig = await getTestConfig()

    vi.stubGlobal('fetch', () => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                items: [
                    {
                        snippet: {
                            resourceId: {
                                videoId: 'videoId'
                            },
                            title: 'title',
                            description: '',
                            thumbnails: {
                                default: {
                                    url: DEFAULT_THUMBNAIL_URL
                                }
                            }
                        }
                    }
                ]
            })
        })
    })

    const fetcher = new YoutubeUploads(
        testConfig.services.youtube.uploads_api_key,
        testConfig.fetchables.youtube
    )
    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe(DEFAULT_THUMBNAIL_URL)
})

test('it returns empty array when no channels are set to be fetched', async () => {
    const testConfig = await getTestConfig()

    for (const channel of testConfig.fetchables.youtube) {
        channel.uploads = false
    }

    const fetchSpy = vi.spyOn(global, 'fetch')

    const fetcher = new YoutubeUploads(
        testConfig.services.youtube.uploads_api_key,
        testConfig.fetchables.youtube
    )

    const result = await fetcher.fetch()

    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
})