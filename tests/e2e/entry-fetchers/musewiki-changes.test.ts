import { MuseWikiChanges } from '@/src/entry-fetchers/musewiki-changes'
import { expect, test } from 'vitest'

test('it fetches entries', async (context) => {
    const fetcher = new MuseWikiChanges()

    try {
        const fetchResult = await fetcher.fetch()

        expect(Array.isArray(fetchResult)).toBe(true)
        expect(fetchResult.length).toBeGreaterThan(0)

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
    } catch (error) {
        if (error instanceof Error && error.message.includes('HTTP 403')) {
            console.warn('Skipping MuseWiki e2e test: live API blocked the runner (403, likely Cloudflare)')
            context.skip()
        }

        throw error
    }
}, 20000)