import {afterAll, afterEach, beforeAll, expect, test} from 'vitest'
import {DomainCertificates} from "@/src/entry-fetchers/domain-certificates";
import {http, HttpResponse} from 'msw'
import {promises as fs} from "fs";
import path from "node:path";
import {server} from "@/tests/__utils__/msw-server";

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('it throws error when no domain is specified', async () => {
    // @ts-expect-error: TS2554
    const fetcherWithoutConstructParam = new DomainCertificates()
    await expect(fetcherWithoutConstructParam.fetch()).rejects.toThrow('Domain is not set')

    const fetcherWithUndefinedParam = new DomainCertificates(undefined)
    await expect(fetcherWithUndefinedParam.fetch()).rejects.toThrow('Domain is not set')
})

test('throws error on not OK response', async () => {
    server.use(
        http.get('https://crt.sh/json', () => {
            return HttpResponse.json({}, { status: 503 })
        })
    )

    const fetcher = new DomainCertificates('muse.mu')
    await expect(fetcher.fetch()).rejects.toThrow('Response status')
})

test('it returns unique domain certificate entries on good response', async () => {
    const goodJsonResponse = await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/domain-certificates/good-json-response.json'),
        { encoding: 'utf-8' }
    );

    server.use(
        http.get('https://crt.sh/json', () => {
            return HttpResponse.json(JSON.parse(goodJsonResponse), { status: 200 })
        })
    )

    const fetcher = new DomainCertificates('muse.mu')
    const result = await fetcher.fetch()

    expect(result).toMatchSnapshot()
})
