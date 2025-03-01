import {expect, test, vi, beforeEach } from 'vitest'
import {MusemuStore} from "@/src/entry-fetchers/musemu-store";

test('it fetches entries', async () => {
    const fetcher = new MusemuStore()
    const result = await fetcher.fetch()

    expect(result.length).toBeGreaterThan(0)
    expect(typeof result[0].title).toBe('string')
    expect(typeof result[0].url).toBe('string')
    expect(typeof result[0].image_url).toBe('string')
}, 20000)