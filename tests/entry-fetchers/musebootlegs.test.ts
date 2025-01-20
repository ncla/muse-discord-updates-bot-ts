import {Musebootlegs} from "../../src/entry-fetchers/musebootlegs";
import {expect, test, vi, beforeEach } from 'vitest'
import {IConfig} from "../../src/config";
import { promises as fs } from "fs";
import path from "node:path";
import { setupServer } from 'msw/node'
import { graphql, http, HttpResponse } from 'msw'

beforeEach(() => {
    vi.resetModules()
})

test('parses latest torrents', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig
    const fetcher = new Musebootlegs(testConfig)

    const html = await fs.readFile(
        path.join(__dirname, '../__fixtures__/entry-fetchers/musebootlegs/torrent-list-response-good.html'),
        { encoding: 'utf-8' }
    );

    const parsed = await fetcher.parseTorrentListResponse(html);

    expect(parsed).toMatchSnapshot()
})

test('throws error on missing login credentials', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = undefined
    testConfig.services.musebootlegs.password = undefined

    const fetcher = new Musebootlegs(testConfig)

    await expect(fetcher.fetch()).rejects.toThrow('MuseBootlegs username, password or user agent is not set')
})

test('throws error on missing user agent', async () => {
    const config = await import('../../src/config')
    const testConfig = config.default as IConfig

    testConfig.services.musebootlegs.username = 'test'
    testConfig.services.musebootlegs.password = 'test'
    testConfig.services.musebootlegs.user_agent = undefined

    const fetcher = new Musebootlegs(testConfig)

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

    const fetcher = new Musebootlegs(testConfig)
    await expect(fetcher.fetch()).rejects.toThrow('Failed to get login cookies')

    server.close()
    server.resetHandlers()
})