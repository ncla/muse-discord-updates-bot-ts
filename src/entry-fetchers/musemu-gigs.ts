import {EntryFetcher} from "@/src/entry-fetchers/index";
import * as puppeteer from 'puppeteer';
import {MuseMuGigsUpdate, UpdateType} from "@/src/updates";
import * as Sentry from "@sentry/node";

export class MusemuGigs implements EntryFetcher
{
    async fetch()
    {
        const browser = await puppeteer.launch({
            // headless: false,
        })

        const page = await browser.newPage()

        let reachedLastPage = false
        let pageNumber = 0
        let gigs: MuseMuGigsUpdate[] = []

        while (!reachedLastPage) {
            const url = `https://www.muse.mu/tour?page=${pageNumber}`

            await page.goto(url, {
                waitUntil: 'networkidle0'
            })

            const currentPageGigs = await this.parseTourPageElements(page)

            gigs = [...gigs, ...currentPageGigs]

            // Prevent too much DoS if the logic for determining last page is incorrect
            if (currentPageGigs.length === 0 || pageNumber === 10) {
                reachedLastPage = true
                break
            }

            pageNumber++
        }

        await browser.close()

        return gigs
    }

    async parseTourPageElements(page: puppeteer.Page): Promise<MuseMuGigsUpdate[]> {
        const selector = '.view-tour .view-content .item-list ul li'

        const listElements = await page.$$(selector)

        const results: MuseMuGigsUpdate[] = []

        for (const listEl of listElements) {
            try {
                const tourLinkElement = await listEl.$('.tourMoreInfoLink');
                const tourTitleElement = await listEl.$('.tourtitle')
                const tourCityElement = await listEl.$('.tourCity')
                const eventDateElement = await listEl.$('.event-date')

                if (!tourLinkElement || !tourTitleElement || !tourCityElement || !eventDateElement) {
                    continue
                }

                const url = await tourLinkElement.evaluate(el => el.getAttribute('href'))

                if (!url) {
                    continue
                }

                const tourTitleElText = await tourTitleElement.evaluate(el => el.textContent)

                if (!tourTitleElText) {
                    continue
                }

                const tourCityElText = await tourCityElement.evaluate(el => el.textContent)

                if (!tourCityElText) {
                    continue
                }

                const eventDateText = await eventDateElement.evaluate(el => el.textContent)
                const eventDateUTC = new Date(eventDateText + 'UTC')

                let title = `${tourTitleElText.trim()}, ${tourCityElText.trim()}`

                if (title.endsWith(',')) {
                    title = title.slice(0, -1)
                }

                results.push({
                    type: UpdateType.MUSEMU_GIG,
                    uniqueId: new URL(url, 'https://muse.mu').pathname.replace('/tour-date/', ''),
                    id: new URL(url, 'https://muse.mu').pathname.replace('/tour-date/', ''),
                    title: title,
                    url: new URL(url, 'https://muse.mu').href,
                    event_date: eventDateUTC,
                })
            } catch (error) {
                console.error('Error processing list element:', error);
                Sentry.captureException(error);
            }
        }

        return results
    }
}