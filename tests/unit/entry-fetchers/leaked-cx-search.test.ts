import {LeakedCxSearch} from "@/src/entry-fetchers/leaked-cx-search"
import {UpdateType} from "@/src/updates"
import {afterAll, afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {promises as fs} from "fs"
import path from "node:path"
import {http, HttpResponse} from 'msw'
import {server} from "@/tests/__utils__/msw-server"

const fixturesPath = '../../__fixtures__/entry-fetchers/leaked-cx-search'

beforeAll(() => server.listen({onUnhandledRequest: 'error'}))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
    vi.resetModules()
})

async function readFixture(name: string): Promise<string> {
    return fs.readFile(path.join(__dirname, fixturesPath, name), {encoding: 'utf-8'})
}

function mockSuccessfulFlow(resultsHtml: string): void {
    server.use(
        http.get('https://leaked.cx/login/', async () => {
            return HttpResponse.html(await readFixture('login-page.html'))
        }),
        http.post('https://leaked.cx/login/login', () => {
            return HttpResponse.json(
                {status: 'ok', redirect: 'https://leaked.cx/'},
                {headers: {'Set-Cookie': 'xf_user=fakeuser; path=/; secure; httponly'}}
            )
        }),
        http.get('https://leaked.cx/search/', async () => {
            return HttpResponse.html(await readFixture('search-form.html'))
        }),
        http.post('https://leaked.cx/search/search', () => {
            return HttpResponse.json({
                status: 'ok',
                redirect: 'https://leaked.cx/search/123/?q=muse&c[title_only]=1&o=date',
            })
        }),
        http.get('https://leaked.cx/search/123/', () => {
            return HttpResponse.html(resultsHtml)
        })
    )
}

test('throws error on missing credentials', async () => {
    const fetcher = new LeakedCxSearch(undefined, undefined, 'agent')
    await expect(fetcher.fetch()).rejects.toThrow('leaked.cx username, password or user agent is not set')
})

test('throws error on missing user agent', async () => {
    const fetcher = new LeakedCxSearch('user', 'pass', undefined)
    await expect(fetcher.fetch()).rejects.toThrow('leaked.cx username, password or user agent is not set')
})

test('throws error on failed login', async () => {
    server.use(
        http.get('https://leaked.cx/login/', async () => {
            return HttpResponse.html(await readFixture('login-page.html'))
        }),
        http.post('https://leaked.cx/login/login', () => {
            return HttpResponse.json({status: 'error', errors: ['Incorrect password']})
        })
    )

    const fetcher = new LeakedCxSearch('user', 'pass', 'agent')
    await expect(fetcher.fetch()).rejects.toThrow('leaked.cx login failed')
})

test('throws error on failed search', async () => {
    server.use(
        http.get('https://leaked.cx/login/', async () => {
            return HttpResponse.html(await readFixture('login-page.html'))
        }),
        http.post('https://leaked.cx/login/login', () => {
            return HttpResponse.json(
                {status: 'ok'},
                {headers: {'Set-Cookie': 'xf_user=fakeuser; path=/'}}
            )
        }),
        http.get('https://leaked.cx/search/', async () => {
            return HttpResponse.html(await readFixture('search-form.html'))
        }),
        http.post('https://leaked.cx/search/search', () => {
            return HttpResponse.json({status: 'error', message: 'Please enter a search query'})
        })
    )

    const fetcher = new LeakedCxSearch('user', 'pass', 'agent')
    await expect(fetcher.fetch()).rejects.toThrow('leaked.cx search failed')
})

test('fetches and maps search results into thread updates', async () => {
    mockSuccessfulFlow(await readFixture('search-results.html'))

    const fetcher = new LeakedCxSearch('user', 'pass', 'agent')
    const result = await fetcher.fetch()

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
        type: UpdateType.LEAKED_CX_THREAD,
        id: '151541',
        uniqueId: '151541',
        parent_id: null,
        parent_title: null,
        image_url: null,
        title: 'Demi Lovato - Amnesia, Muse',
        url: 'https://leaked.cx/threads/demi-lovato-amnesia-muse.151541/',
        content: expect.any(String),
        author: {
            id: null,
            name: 'bubblebath',
            image_url: null,
        },
        created_at: new Date(1714261016 * 1000),
    })
    expect(result.map(entry => entry.uniqueId)).toEqual(['151541', '151439', '84607'])
})

test('parses search results into structured updates', async () => {
    const fetcher = new LeakedCxSearch('user', 'pass', 'agent')

    const parsed = fetcher.parseSearchResults(await readFixture('search-results.html'))

    expect(parsed).toHaveLength(3)
    expect(parsed[2].title).toBe('Muse to release the first chart-eligible NFT album. Are NFTs really "the future of music"?')
    expect(parsed[2].author.name).toBe('charlotte')
})
