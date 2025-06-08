import {expect, test, vi, beforeEach } from 'vitest'
import {WarnermusicAustraliaStore} from "@/src/entry-fetchers/warnermusic-au-store";

test('it fetches entries', async () => {
    const fetcher = new WarnermusicAustraliaStore()
    const result = await fetcher.fetch()

    expect(result.length).toBeGreaterThan(0)
    expect(typeof result[0].title).toBe('string')
    expect(typeof result[0].url).toBe('string')
    expect(typeof result[0].image_url).toBe('string')
}, 120000)