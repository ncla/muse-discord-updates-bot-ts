import {Musebootlegs} from "@/src/entry-fetchers/musebootlegs";
import {expect, test, vi, beforeEach } from 'vitest'
import {IConfig} from "@/src/config";
import { promises as fs } from "fs";
import path from "node:path";
import { setupServer } from 'msw/node'
import { graphql, http, HttpResponse } from 'msw'

beforeEach(() => {
    vi.resetModules()
})

test('throws error on missing login credentials', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = undefined
    testConfig.services.musebootlegs.password = undefined

    const fetcher = new Musebootlegs(
        testConfig.services.musebootlegs.username,
        testConfig.services.musebootlegs.password,
        testConfig.services.musebootlegs.user_agent
    )

    await expect(fetcher.fetch()).rejects.toThrow('MuseBootlegs username, password or user agent is not set')
})

test('throws error on missing user agent', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = 'test'
    testConfig.services.musebootlegs.password = 'test'
    testConfig.services.musebootlegs.user_agent = undefined

    const fetcher = new Musebootlegs(
        testConfig.services.musebootlegs.username,
        testConfig.services.musebootlegs.password,
        testConfig.services.musebootlegs.user_agent
    )

    await expect(fetcher.fetch()).rejects.toThrow('MuseBootlegs username, password or user agent is not set')
})

test('throws error on failed login', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = 'test'
    testConfig.services.musebootlegs.password = 'test'
    testConfig.services.musebootlegs.user_agent = 'test'

    const failedLoginHtmlResponse = await fs.readFile(
        path.join(__dirname, '../__fixtures__/entry-fetchers/musebootlegs/failed-login-response.html'),
        { encoding: 'utf-8' }
    );

    const requestHandlers = [
        http.post('https://www.musebootlegs.com/ajax/login.php', () => {
            // A failed login response will have 200 status code, HTML response, no Set-Cookie header
            return HttpResponse.html(
                failedLoginHtmlResponse,
                {
                    status: 200,
                    statusText: 'OK',
                }
            )
        }),
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new Musebootlegs(
        testConfig.services.musebootlegs.username,
        testConfig.services.musebootlegs.password,
        testConfig.services.musebootlegs.user_agent
    )
    await expect(fetcher.fetch()).rejects.toThrow('Failed to get login cookies')

    server.close()
    server.resetHandlers()
})

test('throws error on failed torrent list request', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = 'test'
    testConfig.services.musebootlegs.password = 'test'
    testConfig.services.musebootlegs.user_agent = 'test'

    const noPermissionErrorBoxHtml = await fs.readFile(
        path.join(__dirname, '../__fixtures__/entry-fetchers/musebootlegs/no-permission-error-box-response.html'),
        { encoding: 'utf-8' }
    );

    const requestHandlers = [
        http.post('https://www.musebootlegs.com/ajax/login.php', () => {
            // A failed login response will have 200 status code, HTML response, no Set-Cookie header
            return new HttpResponse(
                null,
                {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                        'Set-Cookie': 'tsue_member=fake; expires=Mon, 20-Jan-2030 19:12:18 GMT; Max-Age=1800; path=/'
                    }
                }
            )
        }),
        http.post('https://www.musebootlegs.com/', ({ request }) => {
            const url = new URL(request.url)

            const pParam = url.searchParams.get('p')
            const pidParam = url.searchParams.get('pid')

            if (pParam === 'torrents' && pidParam === '10') {
                return HttpResponse.html(
                    noPermissionErrorBoxHtml,
                    {
                        status: 200,
                        statusText: 'OK',
                    }
                )
            }

            return HttpResponse.error()
        })
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new Musebootlegs(
        testConfig.services.musebootlegs.username,
        testConfig.services.musebootlegs.password,
        testConfig.services.musebootlegs.user_agent
    )
    await expect(fetcher.fetch()).rejects.toThrow('Error box found')

    server.close()
    server.resetHandlers()
})

test('torrent list request bad status code throws error', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = 'test'
    testConfig.services.musebootlegs.password = 'test'
    testConfig.services.musebootlegs.user_agent = 'test'

    const requestHandlers = [
        http.post('https://www.musebootlegs.com/ajax/login.php', () => {
            // A failed login response will have 200 status code, HTML response, no Set-Cookie header
            return new HttpResponse(
                null,
                {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                        'Set-Cookie': 'tsue_member=fake; expires=Mon, 20-Jan-2030 19:12:18 GMT; Max-Age=1800; path=/'
                    }
                }
            )
        }),
        http.post('https://www.musebootlegs.com/', ({ request }) => {
            const url = new URL(request.url)

            const pParam = url.searchParams.get('p')
            const pidParam = url.searchParams.get('pid')

            if (pParam === 'torrents' && pidParam === '10') {
                return HttpResponse.html(
                    null,
                    {
                        status: 403,
                        statusText: 'OK',
                    }
                )
            }

            return HttpResponse.error()
        })
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new Musebootlegs(
        testConfig.services.musebootlegs.username,
        testConfig.services.musebootlegs.password,
        testConfig.services.musebootlegs.user_agent
    )
    await expect(fetcher.fetch()).rejects.toThrow('Failed to get torrent list response')

    server.close()
    server.resetHandlers()
})

test('it fetches torrent list', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = 'test'
    testConfig.services.musebootlegs.password = 'test'
    testConfig.services.musebootlegs.user_agent = 'test'

    const torrentListHtml = await fs.readFile(
        path.join(__dirname, '../__fixtures__/entry-fetchers/musebootlegs/torrent-list-response-good.html'),
        { encoding: 'utf-8' }
    );

    const requestHandlers = [
        http.post('https://www.musebootlegs.com/ajax/login.php', () => {
            // A failed login response will have 200 status code, HTML response, no Set-Cookie header
            return new HttpResponse(
                null,
                {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                        'Set-Cookie': 'tsue_member=fake; expires=Mon, 20-Jan-2030 19:12:18 GMT; Max-Age=1800; path=/'
                    }
                }
            )
        }),
        http.post('https://www.musebootlegs.com/', ({ request }) => {
            const url = new URL(request.url)

            const pParam = url.searchParams.get('p')
            const pidParam = url.searchParams.get('pid')

            if (pParam === 'torrents' && pidParam === '10') {
                return HttpResponse.html(
                    torrentListHtml,
                    {
                        status: 200,
                        statusText: 'OK',
                    }
                )
            }

            return HttpResponse.error()
        })
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new Musebootlegs(
        testConfig.services.musebootlegs.username,
        testConfig.services.musebootlegs.password,
        testConfig.services.musebootlegs.user_agent
    )

    await expect(await fetcher.fetch()).toMatchSnapshot()

    server.close()
    server.resetHandlers()
})

test('parses latest torrents', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig
    const fetcher = new Musebootlegs(
        testConfig.services.musebootlegs.username,
        testConfig.services.musebootlegs.password,
        testConfig.services.musebootlegs.user_agent
    )

    const html = await fs.readFile(
        path.join(__dirname, '../__fixtures__/entry-fetchers/musebootlegs/torrent-list-response-good.html'),
        { encoding: 'utf-8' }
    );

    const parsed = await fetcher.parseTorrentListResponse(html);

    expect(parsed).toMatchSnapshot()
})