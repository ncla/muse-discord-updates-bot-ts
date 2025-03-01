import {expect, test} from 'vitest'
import {DomainCertificates} from "@/src/entry-fetchers/domain-certificates";
import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {promises as fs} from "fs";
import path from "node:path";

test('it throws error when no domain is specified', async () => {
    // @ts-expect-error: TS2554
    const fetcherWithoutConstructParam = new DomainCertificates()
    await expect(fetcherWithoutConstructParam.fetch()).rejects.toThrow('Domain is not set')

    const fetcherWithUndefinedParam = new DomainCertificates(undefined)
    await expect(fetcherWithUndefinedParam.fetch()).rejects.toThrow('Domain is not set')
})

test('throws error on not OK response', async () => {
    const requestHandlers = [
        http.get('https://crt.sh/json', () => {
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

    const fetcher = new DomainCertificates('muse.mu')
    await expect(fetcher.fetch()).rejects.toThrow('Response status')

    server.close()
    server.resetHandlers()
})

test('it returns unique domain certificate entries on good response', async () => {
    const goodJsonResponse = await fs.readFile(
        path.join(__dirname, '../../__fixtures__/entry-fetchers/domain-certificates/good-json-response.json'),
        { encoding: 'utf-8' }
    );

    const requestHandlers = [
        http.get('https://crt.sh/json', () => {
            return HttpResponse.json(
                JSON.parse(goodJsonResponse),
                {
                    status: 200,
                }
            )
        }),
    ]

    const server = setupServer(...requestHandlers)
    server.listen({ onUnhandledRequest: 'error' })

    const fetcher = new DomainCertificates('muse.mu')
    const result = await fetcher.fetch()

    expect(result).toMatchSnapshot()

    server.close()
    server.resetHandlers()
})