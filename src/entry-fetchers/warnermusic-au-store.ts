import {EntryFetcher} from "@/src/entry-fetchers";
import * as puppeteer from 'puppeteer';
import {UpdateType, WarnerAustraliaStoreUpdate, WarnerCanadaStoreUpdate} from "@/src/updates";
import {ensureUrlProtocol} from "@/src/common";

export class WarnermusicAustraliaStore implements EntryFetcher
{
    async fetch()
    {
        const browser = await puppeteer.launch({
            // headless: false
        });

        try {
            const page = await browser.newPage();

            await page.goto('https://store.warnermusic.com.au/collections/muse', {
                waitUntil: 'networkidle0'
            });

            const timeout = Date.now() + 20000;

            const results = []

            while (true) {
                if (Date.now() > timeout) {
                    console.warn('Timeout reached, stopping pagination.');
                    break;
                }

                results.push(...await this.parseCollectionsPage(page));

                const nextPageButtonSelector = '.pagination .pagination__item--prev'

                // On this page, previous button is next page button, possibly due to dev being left-handed
                const nextPageButton = await page.$(nextPageButtonSelector);
                if (!nextPageButton) break;

                await Promise.all([
                    page.evaluate((selector) => {
                        const button = document.querySelector(selector);
                        if (button) (button as HTMLElement).click();
                    }, nextPageButtonSelector),
                    page.waitForNavigation({waitUntil: 'networkidle0'})
                ]);
            }

            return results;
        } catch (e) {
            throw e
        } finally {
            await browser.close();
        }
    }

    private async parseCollectionsPage(page: puppeteer.Page): Promise<WarnerAustraliaStoreUpdate[]> {
        const productsFromPageContext = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.product-grid .product-grid__item')).map(el => ({
                title: el.querySelector('h3.card__heading.heading-md')?.textContent?.trim(),
                url: el.querySelector('a')?.getAttribute('href'),
                image_url: el.querySelector('.card__media img')?.getAttribute('src') ?? null
            }));
        })

        const results: WarnerAustraliaStoreUpdate[] = [];

        for (const product of productsFromPageContext) {
            if (!product.title || !product.url) {
                throw new Error(`Missing required product attributes: ${JSON.stringify(product)}`);
            }

            const productFullUrl = new URL(product.url, 'https://store.warnermusic.com.au').href;

            results.push({
                type: UpdateType.WARNER_AU_STORE,
                uniqueId: '(AU) ' + product.title,
                id: '(AU) ' + product.title,
                title: product.title,
                url: productFullUrl,
                image_url: product.image_url ? new URL(ensureUrlProtocol(product.image_url)).href : null,
            });
        }

        return results;
    }
} 