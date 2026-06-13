import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { MusemuGigs } from '@/src/entry-fetchers/musemu-gigs'
import { UpdateType } from '@/src/updates'
import { http, HttpResponse } from 'msw'
import { promises as fs } from 'fs'
import path from 'node:path'
import { server } from '@/tests/__utils__/msw-server'

const endpoint = 'https://rest.bandsintown.com/V4/artists/id_143/events/'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('throws error on not OK response', async () => {
    server.use(
        http.get(endpoint, () => {
            return HttpResponse.json({}, { status: 503 })
        })
    )

    const fetcher = new MusemuGigs()
    await expect(fetcher.fetch()).rejects.toThrow('HTTP error! Status: 503')
})

test('throws error on failed zod validation', async () => {
    server.use(
        http.get(endpoint, () => {
            return HttpResponse.json({ invalid: 'data' }, { status: 200 })
        })
    )

    const fetcher = new MusemuGigs()
    await expect(fetcher.fetch()).rejects.toThrow()
})

test('maps events into gig updates', async () => {
    const fixture = await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/musemu-gigs/events-response.json'),
        { encoding: 'utf-8' }
    )

    server.use(
        http.get(endpoint, () => {
            return HttpResponse.json(JSON.parse(fixture), { status: 200 })
        })
    )

    const fetcher = new MusemuGigs()
    const result = await fetcher.fetch()

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
        type: UpdateType.MUSEMU_GIG,
        uniqueId: '1037176393',
        id: '1037176393',
        title: 'Summerfest | Presented by American Family Insurance, Milwaukee, WI',
        url: 'https://www.bandsintown.com/e/1037176393',
        event_date: new Date('2026-07-02T19:00:00Z'),
    })
})
