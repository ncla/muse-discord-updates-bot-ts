import { EntryFetcher } from "@/src/entry-fetchers/index";
import { MuseWikiChangeUpdate, UpdateType } from "@/src/updates";
import {MediaWikiRecentChangesResponseSchema} from "@/src/zod-schemas/musewiki-changes";

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
