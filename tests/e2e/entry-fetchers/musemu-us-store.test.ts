import {expect, test } from 'vitest'
import {MusemuUsStore} from "@/src/entry-fetchers/musemu-us-store";

test('it fetches entries', async () => {
    const fetcher = new MusemuUsStore()
    const result = await fetcher.fetch()

    expect(result.length).toBeGreaterThan(0)
    expect(typeof result[0].title).toBe('string')
    expect(typeof result[0].url).toBe('string')
    expect(typeof result[0].image_url).toBe('string')
}, 20000)