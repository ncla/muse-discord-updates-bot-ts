import {YoutubeUploads} from "../../src/entry-fetchers/youtube-uploads";
import {expect, test, vi } from 'vitest'
import {IConfig} from "../../src/config";

// TODO: flaky. depends on an actual API response.
test('fetches youtube uploads', async () => {
    vi.resetModules()

    const fetcher = new YoutubeUploads()
    const fetchResult = await fetcher.fetch()

    expect(Array.isArray(fetchResult)).toBe(true)
    expect(fetchResult.length).toBe(25)
})

test('throws error when no API key is set', async () => {
    vi.resetModules()

    const configImport = await vi.importActual('../../src/config')
    const originalConfig = configImport.default as IConfig

    vi.doMock('../../src/config', () => ({
        default: {
            ...originalConfig,
            services: {
                youtube: {
                    uploads_api_key: undefined
                }
            },
        }
    }));

    const { YoutubeUploads } = await vi.importActual<
        typeof import('../../src/entry-fetchers/youtube-uploads')
    >('../../src/entry-fetchers/youtube-uploads');

    const fetcher = new YoutubeUploads()
    await expect(fetcher.fetch()).rejects.toThrow()
})

// TODO: flaky. depends on an actual API response.
test('throws 400 HTTP error when incorrect API key is set', async () => {
    vi.resetModules()

    const configImport = await vi.importActual('../../src/config')
    const originalConfig = configImport.default as IConfig

    vi.doMock('../../src/config', () => ({
        default: {
            ...originalConfig,
            services: {
                youtube: {
                    uploads_api_key: 'incorrect'
                }
            },
        }
    }));

    const { YoutubeUploads } = await vi.importActual<
        typeof import('../../src/entry-fetchers/youtube-uploads')
    >('../../src/entry-fetchers/youtube-uploads');

    const fetcher = new YoutubeUploads
    await expect(fetcher.fetch()).rejects.toThrow('Response status: 400')
})

test('content is null when no description is provided for video', async () => {
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

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].content).toBeNull()
})

test('content is set when description is provided', async () => {
    const DESCRIPTION = 'Description :)'

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

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].content).toBe(DESCRIPTION)
})

test('uses standard thumbnail if it is provided', async () => {
    const STANDARD_THUMBNAIL_URL = 'https://thumbnail.com/standard.jpg'
    const DEFAULT_THUMBNAIL_URL = 'https://thumbnail.com/default.jpg'

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

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe(STANDARD_THUMBNAIL_URL)
})

test('uses default thumbnail if standard is not present', async () => {
    const DEFAULT_THUMBNAIL_URL = 'https://thumbnail.com/default.jpg'

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

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe(DEFAULT_THUMBNAIL_URL)
})