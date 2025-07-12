import {EntryFetcher} from "@/src/entry-fetchers";
import * as puppeteer from 'puppeteer';
import {MusemuUsStoreUpdate, UpdateType} from "@/src/updates";
import {ensureUrlProtocol} from "@/src/common";

export class MusemuUsStore implements EntryFetcher
{
    async fetch()
    {
        const browser = await puppeteer.launch({
            // headless: false
        });

        try {
            const page = await browser.newPage();

            await page.goto('https://usstore.muse.mu/collections/all?page=1', {
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

                const nextPageButtonSelector = '.pagination__list .pagination__item--prev'

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
        } finally {
            await browser.close();
            const process = browser.process();
            if (process && !process.killed) {
                process.kill('SIGTERM');
            }
        }
    }

    private async parseCollectionsPage(page: puppeteer.Page): Promise<MusemuUsStoreUpdate[]> {
        const productsFromPageContext = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#product-grid .grid__item')).map(el => ({
                title: el.querySelector('.card-information__text.h5 a')?.textContent?.trim(),
                url: el.querySelector('.card-information__text.h5 a')?.getAttribute('href'),
                image_url: el.querySelector('.media img')?.getAttribute('src')
            }));
        })

        const results: MusemuUsStoreUpdate[] = [];

        for (const product of productsFromPageContext) {
            if (!product.title || !product.url || !product.image_url) {
                throw new Error(`Missing required product attributes: ${JSON.stringify(product)}`);
            }

            const productFullUrl = new URL(product.url, 'https://usstore.muse.mu').href;
            const productImageFullUrl = new URL(ensureUrlProtocol(product.image_url)).href;

            results.push({
                type: UpdateType.MUSEMU_US_STORE,
                uniqueId: '(US) ' + product.title,
                id: '(US) ' + product.title,
                title: product.title,
                url: productFullUrl,
                image_url: productImageFullUrl,
            });
        }

        return results;
    }
} 