import {EntryFetcher} from "@/src/entry-fetchers/index";
import {JSDOM} from 'jsdom'
import {createBlankUpdate, MuseBootlegsTorrentUpdate, UpdateType} from "@/src/updates";
import * as Sentry from "@sentry/node";

export class Musebootlegs implements EntryFetcher
{
    constructor(
        private username: string | undefined,
        private password: string | undefined,
        private userAgent: string | undefined
    ) {
    }

    async fetch()
    {
        if (
            this.username === undefined ||
            this.password === undefined ||
            this.userAgent === undefined
        ) {
            throw new Error('MuseBootlegs username, password or user agent is not set')
        }

        const loginResponse = await this.sendLoginRequest(
            this.username,
            this.password,
            this.userAgent
        )

        const cookies = loginResponse.headers.getSetCookie()

        if (
            cookies[0] === undefined ||
            !cookies[0].startsWith('tsue_member=')
        ) {
            throw new Error('Failed to get login cookies')
        }

        const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ')

        const torrentListResponse = await this.sendTorrentListRequest(
            cookieHeader,
            this.userAgent
        )

        if (!torrentListResponse.ok) {
            throw new Error('Failed to get torrent list response')
        }

        const torrentListPageHtml = await torrentListResponse.text()

        return this.parseTorrentListResponse(torrentListPageHtml)
    }

    async sendLoginRequest(
        username: string | undefined = undefined,
        password: string | undefined = undefined,
        useragent: string | undefined = undefined
    )
    {
        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            typeof useragent !== 'string'
        ) {
            throw new Error('Missing required parameters for login request')
        }

        const url = 'https://www.musebootlegs.com/ajax/login.php'
        const formData = new FormData()
        formData.append('action', 'login')
        formData.append('loginbox_remember', 'true')
        formData.append('loginbox_membername', username)
        formData.append('loginbox_password', password)

        return fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                // Special user agent must be passed to bypass Cloudflare's protection
                'User-Agent': useragent
            }
        })
    }

    async sendTorrentListRequest(
        cookie: string,
        useragent: string | undefined = undefined
    )
    {
        if (typeof useragent !== 'string') {
            throw new Error('MuseBootlegs user agent is not set')
        }

        const url = 'https://www.musebootlegs.com/?p=torrents&pid=10'
        const formData = new FormData()
        formData.append('sortOptions[sortBy]', 'added')
        formData.append('sortOptions[sortOrder]', 'desc')

        return fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'Cookie': cookie,
                // Special user agent must be passed to bypass Cloudflare's protection
                'User-Agent': useragent
            }
        })
    }

    async parseTorrentListResponse(html: string)
    {
        const dom = new JSDOM(html)

        const document = dom.window.document;

        const errorBox = document.querySelector('#show_error');

        if (errorBox) {
            throw new Error('Error box found')
        }

        const torrentBoxes = document.querySelectorAll('#content > .torrent-box[id^="torrent_"]');

        const entries: MuseBootlegsTorrentUpdate[] = []

        torrentBoxes.forEach((torrentBox) => {
            const entryTextElement = torrentBox.querySelector('.newIndicator')

            if (entryTextElement === null) {
                return
            }

            if (entryTextElement.textContent === null) {
                return
            }

            const entryLink = torrentBox.querySelector('.newIndicator a') as HTMLAnchorElement
            const imageElement = torrentBox.querySelector('.previewImage a') as HTMLAnchorElement
            const authorElement = torrentBox.querySelector('.torrentOwner > span > span')
            const torrentOwnerElement = torrentBox.querySelector('.torrentOwner')
            const descriptionElement = torrentBox.querySelector('.torrentDescription')

            let uploadedDate: Date | null = null

            if (torrentOwnerElement !== null) {
                try {
                    const timeagoElement = torrentOwnerElement.querySelector('abbr.timeago')
                    if (timeagoElement) {
                        const unixTimestamp = timeagoElement.getAttribute('data-time')
                        if (unixTimestamp) {
                            uploadedDate = new Date(parseInt(unixTimestamp) * 1000)
                        }
                    } else {
                        torrentOwnerElement.childNodes.forEach((child) => {
                            // Hacky way to get TEXT_NODE constant https://github.com/jsdom/jsdom/issues/2993
                            if (child.nodeType === new JSDOM('').window.Node.TEXT_NODE) {
                                const uploadedText = child.textContent ?? ''

                                const timestamp = uploadedText.replace('Uploaded ', '').replace(' by', '').trim()

                                if (timestamp.toLowerCase() === 'a moment ago') {
                                    uploadedDate = new Date()
                                } else if (timestamp.startsWith('Today at ')) {
                                    const timeStr = timestamp.replace('Today at ', '')
                                    const [hours, minutes] = timeStr.split(':').map(Number)
                                    const today = new Date()
                                    uploadedDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hours, minutes))
                                } else if (timestamp.startsWith('Yesterday at ')) {
                                    const timeStr = timestamp.replace('Yesterday at ', '')
                                    const [hours, minutes] = timeStr.split(':').map(Number)
                                    const yesterday = new Date()
                                    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
                                    uploadedDate = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), hours, minutes))
                                } else {
                                    const parts = timestamp.split(/[- :]/)
                                    uploadedDate = new Date(Date.UTC(
                                        parseInt(parts[2]),
                                        parseInt(parts[1]) - 1,
                                        parseInt(parts[0]),
                                        parseInt(parts[3]),
                                        parseInt(parts[4])
                                    ))
                                }
                            }
                        })
                    }
                } catch (e) {
                    console.error('Error parsing uploaded date:', e)
                    Sentry.captureException(e);
                }
            }

            const torrentId = torrentBox.id.replace(/^\D+/g, '')

            entries.push({
                ...createBlankUpdate(),
                type: UpdateType.MUSEBOOTLEGS_TORRENT,
                id: torrentId,
                uniqueId: torrentId,
                title: entryTextElement.textContent.trim(),
                content: descriptionElement && descriptionElement.textContent ? descriptionElement.textContent.trim() : null,
                url: entryLink && entryLink.href ? entryLink.href : null,
                image_url: imageElement && imageElement.href ? imageElement.href : null,
                author: {
                    id: null,
                    name: authorElement && authorElement.textContent ? authorElement.textContent : null,
                    image_url: null
                },
                created_at: uploadedDate
            });
        });

        return entries
    }
}