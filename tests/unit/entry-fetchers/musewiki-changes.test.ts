import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { MuseWikiChanges } from '@/src/entry-fetchers/musewiki-changes'
import { http, HttpResponse } from 'msw'
import { promises as fs } from 'fs'
import path from 'node:path'
import { server } from '@/tests/__utils__/msw-server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('throws error on not OK response', async () => {
    server.use(
        http.get('https://musewiki.org/api.php', () => {
            return HttpResponse.json({}, { status: 503 })
        })
    )

    const fetcher = new MuseWikiChanges()
    await expect(fetcher.fetch()).rejects.toThrow('HTTP error! Status: 503')
})

test('throws error on failed zod validation', async () => {
    const invalidResponse = {
        invalid: 'data'
    }

    server.use(
        http.get('https://musewiki.org/api.php', () => {
            return HttpResponse.json(invalidResponse, { status: 200 })
        })
    )

    const fetcher = new MuseWikiChanges()
    await expect(fetcher.fetch()).rejects.toThrow()
})

test('returns updates on successful response', async () => {
    const goodJsonResponse = await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/musewiki-changes/good-response.json'),
        { encoding: 'utf-8' }
    )
    const validResponse = JSON.parse(goodJsonResponse)

    server.use(
        http.get('https://musewiki.org/api.php', () => {
            return HttpResponse.json(validResponse, { status: 200 })
        })
    )

    const fetcher = new MuseWikiChanges()
    const result = await fetcher.fetch()

    expect(result).toMatchSnapshot()
})
