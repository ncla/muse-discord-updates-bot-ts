import {EntryFetcher} from "@/src/entry-fetchers";
import * as puppeteer from 'puppeteer';
import {UpdateType, WarnerCanadaStoreUpdate} from "@/src/updates";
import {ensureUrlProtocol, scrollUntilNoMoreContentLoads} from "@/src/common";

export class WarnerMusicCanadaStore implements EntryFetcher
{
    async fetch()
    {
        const browser = await puppeteer.launch();

        try {
            const page = await browser.newPage();

            try {
                await page.goto('https://store.warnermusic.ca/collections/muse/', {
                    waitUntil: 'networkidle0',
                    timeout: 15000
                });
            } catch (e) {
                if (e instanceof Error && e.name === 'TimeoutError') {
                    console.log('Navigation timeout - continuing anyway');
                } else {
                    throw e;
                }
            }

            await scrollUntilNoMoreContentLoads(
                page,
                '.infinite-scroll__data',
                '.infinite-scroll__loading',
                'center'
            );

            return await this.parseCollectionsPage(page);
        } catch (e) {
            throw e
        } finally {
            await browser.close();
        }
    }

    private async parseCollectionsPage(page: puppeteer.Page): Promise<WarnerCanadaStoreUpdate[]> {
        const productsFromPageContext = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#product-grid .collection-product-card')).map(el => ({
                title: el.querySelector('.card__title.h5')?.textContent?.trim(),
                url: el.querySelector('a.link')?.getAttribute('href'),
                image_url: el.querySelector('.media img')?.getAttribute('src')
            }));
        })

        const results: WarnerCanadaStoreUpdate[] = [];

        for (const product of productsFromPageContext) {
            if (!product.title || !product.url || !product.image_url) {
                throw new Error(`Missing required product attributes: ${JSON.stringify(product)}`);
            }

            const productFullUrl = new URL(product.url, 'https://store.warnermusic.ca').href;
            const productImageFullUrl = new URL(ensureUrlProtocol(product.image_url)).href;

            results.push({
                type: UpdateType.WARNER_CA_STORE,
                uniqueId: '(CA) ' + product.title,
                id: '(CA) ' + product.title,
                title: product.title,
                url: productFullUrl,
                image_url: productImageFullUrl,
            });
        }

        return results;
    }
}