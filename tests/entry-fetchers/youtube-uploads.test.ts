import {YoutubeUploads} from "../../src/entry-fetchers/youtube-uploads";

// TODO: flaky. depends on an actual API response.
test('fetches youtube uploads', async () => {
    const fetcher = new YoutubeUploads()
    const fetchResult = await fetcher.fetch()

    expect(Array.isArray(fetchResult)).toBe(true)
    expect(fetchResult.length).toBe(25)
})

test('throws error when no API key is set', async () => {
    jest.resetModules()

    const originalConfig = jest.requireActual('../../src/config');

    jest.doMock('../../src/config', () => ({
        __esModule: true,
        default: {
            ...originalConfig.default,
            services: {
                youtube: {
                    uploads_api_key: undefined
                }
            },
        }
    }));

    // This feels weird.
    const YoutubeUploads = require('../../src/entry-fetchers/youtube-uploads').YoutubeUploads;

    const fetcher = new YoutubeUploads()
    await expect(fetcher.fetch()).rejects.toThrow()
})

// TODO: flaky. depends on an actual API response.
test('throws 400 HTTP error when incorrect API key is set', async () => {
    jest.resetModules()

    const originalConfig = jest.requireActual('../../src/config');

    jest.doMock('../../src/config', () => ({
        __esModule: true,
        default: {
            ...originalConfig.default,
            services: {
                youtube: {
                    uploads_api_key: 'incorrect'
                }
            },
        }
    }));

    // This feels weird.
    const YoutubeUploads = require('../../src/entry-fetchers/youtube-uploads').YoutubeUploads;

    const fetcher = new YoutubeUploads()
    await expect(fetcher.fetch()).rejects.toThrow('Response status: 400')
})

test('content is null when no description is provided for video', async () => {
    jest
        .spyOn(global, 'fetch')
        .mockImplementation(
            jest.fn(
                () => {
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
                }
            ) as jest.Mock // https://stackoverflow.com/a/64819545/757587
        );

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].content).toBeNull()
})

test('content is set when description is provided', async () => {
    const DESCRIPTION = 'Description :)'

    jest
        .spyOn(global, 'fetch')
        .mockImplementation(
            jest.fn(
                () => {
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
                }
            ) as jest.Mock // https://stackoverflow.com/a/64819545/757587
        );

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].content).toBe(DESCRIPTION)
})

test('uses standard thumbnail if it is provided', async () => {
    const STANDARD_THUMBNAIL_URL = 'https://thumbnail.com/standard.jpg'
    const DEFAULT_THUMBNAIL_URL = 'https://thumbnail.com/default.jpg'

    jest
        .spyOn(global, 'fetch')
        .mockImplementation(
            jest.fn(
                () => {
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
                                                url: STANDARD_THUMBNAIL_URL
                                            },
                                            default: {
                                                url: DEFAULT_THUMBNAIL_URL
                                            }
                                        }
                                    }
                                }
                            ]
                        })
                    })
                }
            ) as jest.Mock // https://stackoverflow.com/a/64819545/757587
        );

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe(STANDARD_THUMBNAIL_URL)
})

test('uses default thumbnail if standard is not present', async () => {
    const DEFAULT_THUMBNAIL_URL = 'https://thumbnail.com/default.jpg'

    jest
        .spyOn(global, 'fetch')
        .mockImplementation(
            jest.fn(
                () => {
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
                }
            ) as jest.Mock // https://stackoverflow.com/a/64819545/757587
        );

    const fetcher = new YoutubeUploads()
    const result = await fetcher.fetch()

    expect(result[0].image_url).toBe(DEFAULT_THUMBNAIL_URL)
})