import {EntryFetcher} from "@/src/entry-fetchers/index";
import {JSDOM} from 'jsdom'
import {createBlankUpdate, LeakedCxThreadUpdate, UpdateType} from "@/src/updates";
import {createResponseError} from "@/src/common";

export class LeakedCxSearch implements EntryFetcher
{
    private readonly origin = 'https://leaked.cx'
    private readonly searchKeyword = 'muse'

    constructor(
        private username: string | undefined,
        private password: string | undefined,
        private userAgent: string | undefined
    ) {
    }

    async fetch(): Promise<LeakedCxThreadUpdate[]>
    {
        if (
            this.username === undefined ||
            this.password === undefined ||
            this.userAgent === undefined
        ) {
            throw new Error('leaked.cx username, password or user agent is not set')
        }

        const cookies = new Map<string, string>()

        const loginPageHtml = await this.fetchPage(`${this.origin}/login/`, cookies)
        const loginToken = this.extractXfToken(loginPageHtml)

        await this.sendLoginRequest(this.username, this.password, loginToken, cookies)

        const searchFormHtml = await this.fetchPage(`${this.origin}/search/?type=post`, cookies)
        const searchToken = this.extractXfToken(searchFormHtml)

        const resultsUrl = await this.sendSearchRequest(searchToken, cookies)
        const resultsHtml = await this.fetchPage(resultsUrl, cookies)

        return this.parseSearchResults(resultsHtml)
    }

    private async fetchPage(url: string, cookies: Map<string, string>): Promise<string>
    {
        const response = await fetch(url, {
            headers: this.buildHeaders(cookies)
        })

        if (!response.ok) {
            throw await createResponseError(response, `Failed to fetch ${url}`)
        }

        this.storeCookies(response, cookies)

        return response.text()
    }

    private async sendLoginRequest(
        username: string,
        password: string,
        token: string,
        cookies: Map<string, string>
    ): Promise<void>
    {
        const body = new URLSearchParams({
            login: username,
            password,
            remember: '1',
            _xfToken: token,
            _xfRedirect: `${this.origin}/`,
            _xfResponseType: 'json',
        })

        const response = await fetch(`${this.origin}/login/login`, {
            method: 'POST',
            body,
            headers: this.buildHeaders(cookies, {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${this.origin}/login/`,
            })
        })

        this.storeCookies(response, cookies)

        const result = await response.json()

        if (result.status !== 'ok') {
            throw new Error(`leaked.cx login failed: ${result.errors ?? result.message ?? 'unknown error'}`)
        }

        if (!cookies.has('xf_user')) {
            throw new Error('leaked.cx login failed: no session cookie returned')
        }
    }

    private async sendSearchRequest(token: string, cookies: Map<string, string>): Promise<string>
    {
        const body = new URLSearchParams({
            keywords: this.searchKeyword,
            'c[title_only]': '1',
            order: 'date',
            _xfToken: token,
            _xfResponseType: 'json',
        })

        const response = await fetch(`${this.origin}/search/search`, {
            method: 'POST',
            body,
            headers: this.buildHeaders(cookies, {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${this.origin}/search/?type=post`,
            })
        })

        this.storeCookies(response, cookies)

        const result = await response.json()

        if (result.status !== 'ok' || typeof result.redirect !== 'string') {
            throw new Error(`leaked.cx search failed: ${result.errors ?? result.message ?? 'unknown error'}`)
        }

        return result.redirect
    }

    parseSearchResults(html: string): LeakedCxThreadUpdate[]
    {
        const dom = new JSDOM(html)
        const document = dom.window.document

        const rows = document.querySelectorAll('li.block-row')

        const entries: LeakedCxThreadUpdate[] = []

        rows.forEach((row) => {
            const link = row.querySelector('.contentRow-title a[href*="/threads/"]') as HTMLAnchorElement | null

            if (link === null) {
                return
            }

            const threadIdMatch = link.getAttribute('href')?.match(/\/threads\/[^/]*\.(\d+)\//)

            if (!threadIdMatch) {
                return
            }

            const threadId = threadIdMatch[1]
            const href = link.getAttribute('href') ?? ''
            const url = href.startsWith('http') ? href : `${this.origin}${href}`

            const titleNode = link.cloneNode(true) as HTMLElement
            titleNode.querySelectorAll('.label, .label-append').forEach(label => label.remove())
            const title = titleNode.textContent ? titleNode.textContent.replace(/\s+/g, ' ').trim() : ''

            const snippetElement = row.querySelector('.contentRow-snippet')
            const timeElement = row.querySelector('time[data-time]')
            const unixTimestamp = timeElement?.getAttribute('data-time')

            entries.push({
                ...createBlankUpdate(),
                type: UpdateType.LEAKED_CX_THREAD,
                id: threadId,
                uniqueId: threadId,
                title,
                url,
                content: snippetElement && snippetElement.textContent ? snippetElement.textContent.trim() : null,
                author: {
                    id: null,
                    name: row.getAttribute('data-author'),
                    image_url: null,
                },
                created_at: unixTimestamp ? new Date(parseInt(unixTimestamp) * 1000) : null,
            })
        })

        return entries
    }

    private extractXfToken(html: string): string
    {
        const match = html.match(/name="_xfToken"\s+value="([^"]+)"/)

        if (!match) {
            throw new Error('leaked.cx _xfToken not found')
        }

        return match[1]
    }

    private buildHeaders(cookies: Map<string, string>, extra: Record<string, string> = {}): Record<string, string>
    {
        const headers: Record<string, string> = {
            'User-Agent': this.userAgent as string,
            ...extra,
        }

        if (cookies.size > 0) {
            headers['Cookie'] = Array.from(cookies.entries())
                .map(([name, value]) => `${name}=${value}`)
                .join('; ')
        }

        return headers
    }

    private storeCookies(response: Response, cookies: Map<string, string>): void
    {
        response.headers.getSetCookie().forEach((cookie) => {
            const [pair] = cookie.split(';')
            const separatorIndex = pair.indexOf('=')

            if (separatorIndex === -1) {
                return
            }

            const name = pair.slice(0, separatorIndex).trim()
            const value = pair.slice(separatorIndex + 1).trim()

            cookies.set(name, value)
        })
    }
}
