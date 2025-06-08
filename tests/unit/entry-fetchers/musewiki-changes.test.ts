import { expect, test } from 'vitest'
import { MuseWikiChanges } from '@/src/entry-fetchers/musewiki-changes'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { promises as fs } from 'fs'
import path from 'node:path'

test('throws error on not OK response', async () => {
    const requestHandlers = [
        http.get('https://musewiki.org/api.php', () => {
            return HttpResponse.json(
                {},
                {
                    status: 503,
                }
            )
        }),
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new MuseWikiChanges()
    await expect(fetcher.fetch()).rejects.toThrow('HTTP error! Status: 503')

    server.close()
    server.resetHandlers()
})

test('throws error on failed zod validation', async () => {
    const invalidResponse = {
        invalid: 'data'
    }

    const requestHandlers = [
        http.get('https://musewiki.org/api.php', () => {
            return HttpResponse.json(
                invalidResponse,
                {
                    status: 200,
                }
            )
        }),
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new MuseWikiChanges()
    await expect(fetcher.fetch()).rejects.toThrow()

    server.close()
    server.resetHandlers()
})

test('returns updates on successful response', async () => {
    const goodJsonResponse = await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/musewiki-changes/good-response.json'),
        { encoding: 'utf-8' }
    )
    const validResponse = JSON.parse(goodJsonResponse)

    const requestHandlers = [
        http.get('https://musewiki.org/api.php', () => {
            return HttpResponse.json(
                validResponse,
                {
                    status: 200,
                }
            )
        }),
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new MuseWikiChanges()
    const result = await fetcher.fetch()

    expect(result).toMatchSnapshot()

    server.close()
    server.resetHandlers()
})