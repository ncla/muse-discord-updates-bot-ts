import {expect, test} from 'vitest'
import {ShopifyStore} from "@/src/entry-fetchers/shopify-store";
import {UpdateType} from "@/src/updates";

test('it fetches entries', async () => {
    const fetcher = new ShopifyStore({
        origin: 'https://store.muse.mu',
        updateType: UpdateType.MUSEMU_STORE,
    })
    const result = await fetcher.fetch()

    expect(result.length).toBeGreaterThan(0)
    expect(typeof result[0].title).toBe('string')
    expect(typeof result[0].url).toBe('string')
    expect(typeof result[0].image_url).toBe('string')
}, 20000)
