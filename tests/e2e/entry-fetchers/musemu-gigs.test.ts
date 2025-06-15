import {expect, test } from 'vitest'
import {MusemuGigs} from "@/src/entry-fetchers/musemu-gigs";

test('it fetches entries', async () => {
    const fetcher = new MusemuGigs()
    const result = await fetcher.fetch()

    // Because there can be no gigs at a time, best we can check for is that it runs without exceptions for now
    expect(Array.isArray(result)).toBe(true)
}, 20000)