import { MuseWikiChanges } from '@/src/entry-fetchers/musewiki-changes'
import { expect, test } from 'vitest'

test('it fetches entries', async () => {
    const fetcher = new MuseWikiChanges()
    const fetchResult = await fetcher.fetch()

    expect(Array.isArray(fetchResult)).toBe(true)
    expect(fetchResult.length).toBeGreaterThan(0)
    
    if (fetchResult.length > 0) {
        const firstEntry = fetchResult[0]
        expect(firstEntry).toHaveProperty('type', 'MUSEWIKI_CHANGE')
        expect(firstEntry).toHaveProperty('uniqueId')
        expect(firstEntry).toHaveProperty('id')
        expect(firstEntry).toHaveProperty('title')
        expect(firstEntry).toHaveProperty('change_type')
        expect(firstEntry).toHaveProperty('user')
        expect(firstEntry).toHaveProperty('pageid')
        expect(firstEntry).toHaveProperty('created_at')
        expect(firstEntry.created_at).toBeInstanceOf(Date)
    }
}, 20000)