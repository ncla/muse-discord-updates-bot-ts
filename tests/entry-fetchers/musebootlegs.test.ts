import {Musebootlegs} from "../../src/entry-fetchers/musebootlegs";
import {expect, test, vi, beforeEach } from 'vitest'
import {IConfig} from "../../src/config";
import { promises as fs } from "fs";
import path from "node:path";

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