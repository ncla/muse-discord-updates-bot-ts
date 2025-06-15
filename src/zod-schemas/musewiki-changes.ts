import { z } from "zod";

// Zod schema for MediaWiki recent change
export const MediaWikiRecentChangeSchema = z.object({
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
export const MediaWikiRecentChangesResponseSchema = z.object({
    batchcomplete: z.string(),
    continue: z.object({
        rccontinue: z.string(),
        continue: z.string()
    }).optional(),
    query: z.object({
        recentchanges: z.array(MediaWikiRecentChangeSchema)
    })
});