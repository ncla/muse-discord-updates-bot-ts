import {EntryFetcher} from "@/src/entry-fetchers";
import * as puppeteer from 'puppeteer';
import {MusemuStoreUpdate, UpdateType} from "@/src/updates";

export class MusemuStore implements EntryFetcher
{
    async fetch()
    {
        const browser = await puppeteer.launch({
            // headless: false
        });

        const page = await browser.newPage();
        
        await page.goto('https://store.muse.mu/eu/search/?q=', {
            waitUntil: 'networkidle0'
        });

        await this.scrollUntilNoMoreContentLoads(page, '.product-grid__bottom');

        const products = await this.parseSearchResults(page);

        await browser.close();

        console.log(`Found ${products.length} products`);

        return products;
    }

    private async scrollUntilNoMoreContentLoads(page: puppeteer.Page, targetSelector: string): Promise<void> {
        const startTime = Date.now();
        const MAX_DURATION = 20000;

        while (true) {
            // Check if we've exceeded the maximum time
            if (Date.now() - startTime >= MAX_DURATION) {
                console.log('Reached maximum scroll time limit of 20 seconds');
                break;
            }

            // Scroll so the target element just appears at the bottom of viewport
            await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    const elementRect = element.getBoundingClientRect();
                    const elementTop = element.getBoundingClientRect().top + window.scrollY;

                    // Calculate scroll position where element would appear at bottom of viewport
                    // Subtract element's height to ensure we can see the whole element
                    const scrollPosition = elementTop - window.innerHeight + elementRect.height;
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                } else {
                    // If element not found, scroll to bottom as fallback
                    window.scrollTo(0, document.body.scrollHeight);
                }
            }, targetSelector);

            try {
                await page.waitForSelector('.spinner', {
                    visible: true,
                    timeout: 1000
                });

                await page.waitForSelector('.spinner', {
                    hidden: true,
                    timeout: 10000
                });

            } catch (error) {
                if (error instanceof puppeteer.TimeoutError) {
                    console.log('No more content to load');
                    break;
                }

                throw error;
            }

            // Small pause to let any new content render
            await new Promise(r => setTimeout(r, 500));
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