import { EntryFetcher } from "@/src/entry-fetchers";
import * as puppeteer from 'puppeteer';
import { FacebookAdUpdate, UpdateType } from "@/src/updates";
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as Sentry from "@sentry/node";
import { scrollUntilNoMoreContentLoads } from "@/src/common";

export class FacebookAdLibrary implements EntryFetcher {
    private readonly baseUrl: string = 'https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page';

    constructor(private readonly pageId: string | undefined) {}

    async fetch(): Promise<FacebookAdUpdate[]> {
        if (!this.pageId) {
            console.log('No Facebook page ID set for Ad Library fetcher');
            return [];
        }
        
        const url = `${this.baseUrl}&view_all_page_id=${this.pageId}`;
        const browser = await puppeteer.launch({
            // headless: false
        });

        try {
            const page = await browser.newPage();

            await page.setViewport({ width: 1280, height: 800 });

            console.log(`Navigating to Facebook Ad Library: ${url}`);
            
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            console.log('Scrolling down to load more ads...');
            
            await scrollUntilNoMoreContentLoads(
                page,
                null,
                '[data-visualcompletion="loading-state"]',
                'end'
            );
            
            console.log('Finding ad containers...');
            const adContainers = await this.findAdContainers(page);
            console.log(`Found ${adContainers.length} ad containers`);

            if (adContainers.length === 0) {
                console.log('No ads found, returning empty array');
                return [];
            }
            
            console.log(`Processing all ${adContainers.length} containers`);
            
            const foundIds = new Set<string>();
            const updates: FacebookAdUpdate[] = [];
            
            for (let i = 0; i < adContainers.length; i++) {
                try {
                    const container = adContainers[i];

                    await this.hideFixedElements(page);

                    const screenshotPath = await this.takeContainerScreenshot(container, i);
                    
                    const adId = await this.extractLibraryIdFromContainer(container, i);
                    
                    if (!adId) {
                        console.log(`No Library ID found for container ${i}, skipping`);
                        continue;
                    }
                    
                    if (foundIds.has(adId)) {
                        console.log(`Duplicate Library ID ${adId} found in container ${i}, skipping`);
                        continue;
                    }
                    
                    foundIds.add(adId);
                    
                    updates.push({
                        type: UpdateType.FACEBOOK_AD,
                        uniqueId: adId,
                        id: adId,
                        screenshot: screenshotPath,
                    });
                } catch (error) {
                    console.error(`Error processing ad container ${i}:`, error);
                }
            }

            console.log(`Successfully extracted ${updates.length} unique ads`);
            return updates;
        } catch (e) {
            console.error('Error fetching Facebook Ad Library:', e);
            Sentry.captureException(e);
            return [];
        } finally {
            await browser.close();
            const process = browser.process();
            if (process && !process.killed) {
                process.kill('SIGTERM');
            }
        }
    }
    
    private async extractLibraryIdFromContainer(container: puppeteer.ElementHandle<Element>, index: number): Promise<string | null> {
        try {
            const libraryId = await container.evaluate(el => {
                const text = el.textContent || '';
                const match = text.match(/Library ID:\s*(\d+)/i);
                return match && match[1] ? match[1] : null;
            });
            
            if (libraryId) {
                console.log(`Found Library ID: ${libraryId} in container ${index}`);
                return libraryId;
            }
            
            return null;
        } catch (error) {
            console.error(`Error extracting Library ID from container ${index}:`, error);
            return null;
        }
    }

    private async findAdContainers(page: puppeteer.Page): Promise<puppeteer.ElementHandle<Element>[]> {
        const matchCount = await page.evaluate(() => {
            const divs = document.querySelectorAll('div');
            let matchCount = 0;
            
            for (let i = 0; i < divs.length; i++) {
                const div = divs[i];
                const style = window.getComputedStyle(div);
                const rect = div.getBoundingClientRect();
                
                if (style.display === 'none' || 
                    style.visibility === 'hidden' || 
                    rect.width < 300 || 
                    rect.height < 200) {
                    continue;
                }
                
                // Use positive matching for specific CSS properties
                let stylesMatched = 0;
                const requiredMatches = 11;
                
                // Border radius properties
                if (style.borderTopLeftRadius === '6px') stylesMatched++;
                if (style.borderTopRightRadius === '6px') stylesMatched++;
                if (style.borderBottomLeftRadius === '6px') stylesMatched++;
                if (style.borderBottomRightRadius === '6px') stylesMatched++;
                
                // Border properties
                if (style.borderTopWidth === '1px' && 
                    style.borderTopStyle === 'solid' &&
                    style.borderTopColor.includes('rgba(0, 0, 0, 0.15)')) stylesMatched++;
                
                if (style.borderLeftWidth === '1px' && 
                    style.borderLeftStyle === 'solid' &&
                    style.borderLeftColor.includes('rgba(0, 0, 0, 0.15)')) stylesMatched++;
                
                if (style.borderRightWidth === '1px' && 
                    style.borderRightStyle === 'solid' &&
                    style.borderRightColor.includes('rgba(0, 0, 0, 0.15)')) stylesMatched++;
                
                if (style.borderBottomWidth === '1px' && 
                    style.borderBottomStyle === 'solid' &&
                    style.borderBottomColor.includes('rgba(0, 0, 0, 0.15)')) stylesMatched++;
                
                // Box shadow
                if (style.boxShadow.includes('0px 0px 5px') && 
                    style.boxShadow.includes('rgba(0, 0, 0, 0.1)')) stylesMatched++;
                
                // Background color
                if (style.backgroundColor === 'rgb(255, 255, 255)') stylesMatched++;
                
                // Box sizing
                if (style.boxSizing === 'border-box') stylesMatched++;
                
                // Check if container has Library ID text
                if (stylesMatched === requiredMatches) {
                    const text = div.textContent || '';
                    const hasLibraryId = /Library ID:\s*\d+/i.test(text);
                    
                    if (hasLibraryId) {
                        div.setAttribute('data-ad-container', 'true');
                        console.log(`Container at (${rect.left}, ${rect.top}) with size ${rect.width}x${rect.height}, matched ${stylesMatched}/${requiredMatches} required styles and contains Library ID`);
                        matchCount++;
                    }
                }
            }
            
            return matchCount;
        });
        
        console.log(`Found ${matchCount} ad containers with Library ID`);
        
        const containers = await page.$$('[data-ad-container="true"]');
        
        console.log(`Successfully found ${containers.length} container elements`);
        return containers;
    }

    private async takeContainerScreenshot(
        container: puppeteer.ElementHandle<Element>,
        index: number
    ): Promise<string | undefined> {
        try {
            const tempDir = path.join(os.tmpdir(), 'muse-discord-bot');
            await fs.mkdir(tempDir, { recursive: true });
            
            const screenshotPath = path.join(tempDir, `facebook-ad-${Date.now()}-${index}.png`);
            await container.screenshot({ path: screenshotPath });
            console.log(`Captured screenshot of container ${index} to ${screenshotPath}`);
            
            return screenshotPath;
        } catch (error) {
            console.log(`Failed to take screenshot of container ${index}: ${(error as Error).message}`);
            return undefined;
        }
    }

    private async hideFixedElements(page: puppeteer.Page): Promise<void> {
        await page.evaluate(() => {
            // Select all fixed position elements
            const fixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.position === 'fixed' || style.position === 'sticky';
            });
            
            // Hide them
            fixedElements.forEach(el => {
                (el as HTMLElement).style.visibility = 'hidden';
            });
        });
    }
}
