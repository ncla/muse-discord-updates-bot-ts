import {expect, test } from 'vitest'
import {MusemuGigs} from "@/src/entry-fetchers/musemu-gigs";

test('it fetches entries', async () => {
    const fetcher = new MusemuGigs()
    const result = await fetcher.fetch()

    expect(result.length).toBeGreaterThan(0)
    expect(typeof result[0].id).toBe('string')
    expect(typeof result[0].title).toBe('string')
    expect(typeof result[0].url).toBe('string')
    expect(result[0].event_date).toBeInstanceOf(Date)
}, 20000)
