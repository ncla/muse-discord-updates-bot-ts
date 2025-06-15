import { EntryFetcher } from "@/src/entry-fetchers/index";
import { MuseWikiChangeUpdate, UpdateType } from "@/src/updates";
import { z } from "zod";

// Zod schema for MediaWiki recent change
const MediaWikiRecentChangeSchema = z.object({
    type: z.string(),
    ns: z.number(),
    title: z.string(),
    pageid: z.number(),
    revid: z.number(),
    old_revid: z.number(),
    rcid: z.number(),
    user: z.string(),
    oldlen: z.number().optional(),
    newlen: z.number().optional(),
    comment: z.string().optional(),
    parsedcomment: z.string().optional(),
    new: z.string().optional(),
    minor: z.string().optional(),
    logtype: z.string().optional(),
    logaction: z.string().optional(),
    timestamp: z.string()
});

// Zod schema for MediaWiki recent changes response
const MediaWikiRecentChangesResponseSchema = z.object({
    batchcomplete: z.string(),
    continue: z.object({
        rccontinue: z.string(),
        continue: z.string()
    }).optional(),
    query: z.object({
        recentchanges: z.array(MediaWikiRecentChangeSchema)
    })
});

export class MuseWikiChanges implements EntryFetcher {
    private readonly apiUrl: string = 'https://musewiki.org/api.php';
    private readonly apiParams = {
        action: 'query',
        list: 'recentchanges',
        rclimit: '50',
        rcprop: 'title|ids|sizes|flags|user|comment|parsedcomment|loginfo|timestamp',
        format: 'json'
    };

    async fetch(): Promise<MuseWikiChangeUpdate[]> {
        const url = new URL(this.apiUrl);

        Object.entries(this.apiParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        const validatedData = MediaWikiRecentChangesResponseSchema.parse(data);
        const recentChanges = validatedData.query.recentchanges;

        console.log(`Fetched ${recentChanges.length} recent changes from MuseWiki`);

        return recentChanges.map((change): MuseWikiChangeUpdate => {
            const changeType = change.type === 'new' ? 'new' : (change.logtype ? 'log' : 'edit');

            return {
                type: UpdateType.MUSEWIKI_CHANGE,
                uniqueId: `${change.pageid}-${change.revid}`,
                id: `${change.revid}`,
                title: change.title,
                change_type: changeType,
                user: change.user,
                comment: change.comment || null,
                pageid: change.pageid,
                old_revid: change.old_revid,
                oldlen: change.oldlen,
                newlen: change.newlen,
                created_at: new Date(change.timestamp),
            };
        });
    }
}
