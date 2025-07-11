import * as puppeteer from 'puppeteer';
import * as Sentry from "@sentry/node";

export type PromiseFunction<T> = () => Promise<T>;

export function retryPromise<T>(
    fn: PromiseFunction<T>,
    maxTries: number = 3,
    delay: number = 1000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const attempt = (totalTries: number) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function handleFailure(error: any) {
                // Capture exception in Sentry if we're on the last retry
                if (totalTries === maxTries) {
                    Sentry.captureException(error);
                    reject(error);
                    return;
                }

                // For intermediate retries, we can add breadcrumbs to track retry attempts
                Sentry.addBreadcrumb({
                    category: 'retry',
                    message: `Retry attempt ${totalTries} of ${maxTries}`,
                    level: 'warning'
                });

                setTimeout(() => {
                    attempt(totalTries + 1);
                }, delay);
            }

            try {
                const result = fn(); // Call the function here

                // If it's a promise, wait for resolution/rejection.
                if (result instanceof Promise) {
                    result.then(resolve).catch(handleFailure);
                } else {
                    // If it's not a promise, resolve directly.
                    resolve(result);
                }
            } catch (error) {
                handleFailure(error); // Handle synchronous errors.
            }
        };

        attempt(1);
    });
}

export function formatDateTimeStringToUTC(date: Date) {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')

    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
        return text
    }

    return text.substring(0, maxLength - suffix.length) + suffix;
}

interface NestedObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allows for any nested structure
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setNestedProperty<T extends NestedObject>(object: T, path: string, value: any) {
    const keys = path.split('.'); // Split the path into keys
    let current: NestedObject = object;

    // Iterate over the keys except for the last one
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];

        // If the key doesn't exist, create an empty object
        if (!current[key]) {
            current[key] = {};
        }

        current = current[key]; // Move deeper into the object
    }

    // Set the value at the last key
    current[keys[keys.length - 1]] = value;
}

const NO_THUMBNAIL_IMAGE_URL = 'https://s.ytimg.com/yts/img/no_thumbnail-vfl4t3-4R.jpg';

export function exportHighestResolutionThumbnailUrlFromThumbnailResource(thumbnails: GoogleApiYouTubeThumbnailResource): string
{
    const thumbnailKeys = Object.keys(thumbnails) as (keyof GoogleApiYouTubeThumbnailResource)[]

    if (thumbnailKeys.length === 0) {
        return NO_THUMBNAIL_IMAGE_URL;
    }

    const highestResolutionThumbnailKey = thumbnailKeys[thumbnailKeys.length - 1];

    const thumbnail = thumbnails[highestResolutionThumbnailKey]

    if (!thumbnail) {
        return NO_THUMBNAIL_IMAGE_URL;
    }

    return thumbnail.url;
}

export async function scrollUntilNoMoreContentLoads(
    page: puppeteer.Page,
    scrollToElementSelector: string | null,
    spinnerSelector: string,
    scrollLogicalPosition: ScrollLogicalPosition
): Promise<void> {
    const startTime = Date.now();
    const MAX_DURATION = 20000;

    while (true) {
        // Check if we've exceeded the maximum time
        if (Date.now() - startTime >= MAX_DURATION) {
            console.log('Reached maximum scroll time limit of 20 seconds');
            break;
        }

        // Scroll to element or bottom of page if selector is null
        await page.evaluate((selector, scrollLogicalPosition) => {
            if (selector) {
                const element = document.querySelector(selector);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: scrollLogicalPosition
                    });
                } else {
                    // If element not found, scroll to bottom as fallback
                    window.scrollTo(0, document.body.scrollHeight);
                }
            } else {
                // If selector is null, scroll to bottom
                window.scrollTo(0, document.body.scrollHeight);
            }
        }, scrollToElementSelector, scrollLogicalPosition);

        try {
            await page.waitForSelector(spinnerSelector, {
                visible: true,
                timeout: 1000
            });

            await page.waitForSelector(spinnerSelector, {
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

export function ensureUrlProtocol(url: string, defaultProtocol = 'https:'): string {
    if (url.startsWith('//')) {
        return `${defaultProtocol}${url}`;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    return `${defaultProtocol}//${url}`;
}
