import {EntryFetcher} from "@/src/entry-fetchers";
import * as puppeteer from 'puppeteer';
import {MusemuStoreUpdate, UpdateType} from "@/src/updates";
import {scrollUntilNoMoreContentLoads} from "@/src/common";
import * as Sentry from "@sentry/node";

export class MusemuStore implements EntryFetcher
{
    async fetch()
    {
        const browser = await puppeteer.launch({
            // headless: false
        });

        try {
            const page = await browser.newPage();

            await page.goto('https://store.muse.mu/eu/search/?q=', {
                waitUntil: 'networkidle0'
            });

            await scrollUntilNoMoreContentLoads(
                page,
                '.product-grid__bottom',
                '.spinner',
                'center'
            );

            return await this.parseSearchResults(page);
        } catch (e) {
            Sentry.captureException(e);
            throw e
        } finally {
            await browser.close();
            const process = browser.process();
            if (process && !process.killed) {
                process.kill('SIGTERM');
            }
        }
    }

    private async parseSearchResults(page: puppeteer.Page): Promise<MusemuStoreUpdate[]> {
        const productsFromPageContext = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.product-grid .product')).map(el => ({
                id: el.getAttribute('data-pid'),
                title: el.querySelector('.pdp-link a.link')?.textContent?.trim(),
                url: el.querySelector('.pdp-link a.link')?.getAttribute('href'),
                image_url: el.querySelector('.tile-image')?.getAttribute('src')
            }));
        })

        const results: MusemuStoreUpdate[] = [];

        for (const product of productsFromPageContext) {
            if (!product.id || !product.title || !product.url || !product.image_url) {
                throw new Error(`Missing required product attributes: ${JSON.stringify(product)}`);
            }

            const productFullUrl = new URL(product.url, 'https://store.muse.mu').href;

            results.push({
                type: UpdateType.MUSEMU_STORE,
                uniqueId: product.id,
                id: product.id,
                title: product.title,
                url: productFullUrl,
                image_url: product.image_url,
            });
        }

        return results;
    }
} 