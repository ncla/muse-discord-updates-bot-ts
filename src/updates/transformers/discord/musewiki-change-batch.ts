import { EmbedBuilder, WebhookMessageCreateOptions } from "discord.js";
import { DiscordBatchUpdateTransformer } from "@/src/updates/transformers";
import { MuseWikiChangeUpdate, UpdateType } from "@/src/updates";
import { getMentionableRoleIdString } from "@/src/updates/transformers/discord/mentionable-role";

const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;
const RECENT_CHANGES_URL = "https://musewiki.org/Special:RecentChanges";

export class MuseWikiChangeBatch implements DiscordBatchUpdateTransformer {
    transformBatch(updates: MuseWikiChangeUpdate[]): WebhookMessageCreateOptions[] {
        if (updates.length === 0) {
            return [];
        }

        const sorted = [...updates].sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime()
        );

        const embed = new EmbedBuilder();
        embed.setTitle(`MuseWiki: ${sorted.length} changes`);
        embed.setURL(RECENT_CHANGES_URL);
        embed.setColor(this.getColorForBatch(sorted));
        embed.setTimestamp(sorted[0].created_at);

        const uniqueUsers = new Set(sorted.map((u) => u.user)).size;
        const uniquePages = new Set(sorted.map((u) => u.pageid)).size;
        const summary = `${sorted.length} changes across ${uniquePages} page${uniquePages === 1 ? "" : "s"} by ${uniqueUsers} contributor${uniqueUsers === 1 ? "" : "s"}`;

        const lines = sorted.map((u) => this.formatChangeLine(u));
        const description = this.fitDescription(summary, lines);
        embed.setDescription(description);

        const mentionRoleIdString = getMentionableRoleIdString(UpdateType.MUSEWIKI_CHANGE);
        const message = [mentionRoleIdString].filter(Boolean).join(" ");

        return [{
            content: message,
            embeds: [embed],
        }];
    }

    private formatChangeLine(update: MuseWikiChangeUpdate): string {
        const icon = this.getChangeIcon(update.change_type);
        const titleLink = `[${this.escapeMarkdown(update.title)}](${this.getChangeUrl(update)})`;
        const userLink = `[${this.escapeMarkdown(update.user)}](https://musewiki.org/User:${encodeURIComponent(update.user.replace(/ /g, "_"))})`;

        const parts: string[] = [`${icon} ${titleLink} — ${userLink}`];

        if (
            update.oldlen !== undefined &&
            update.newlen !== undefined &&
            update.change_type !== "log"
        ) {
            const diff = update.newlen - update.oldlen;
            const diffSign = diff > 0 ? "+" : "";
            parts.push(`(${diffSign}${diff} bytes)`);
        }

        let line = parts.join(" ");

        if (update.comment) {
            const trimmedComment = update.comment.replace(/\s+/g, " ").trim();
            const truncated = trimmedComment.length > 200
                ? `${trimmedComment.substring(0, 197)}...`
                : trimmedComment;
            line += `\n> ${this.escapeMarkdown(truncated)}`;
        }

        return line;
    }

    private fitDescription(summary: string, lines: string[]): string {
        const header = `${summary}\n\n`;
        let body = "";
        let included = 0;

        for (const line of lines) {
            const candidate = body.length === 0 ? line : `${body}\n${line}`;
            const truncatedHint = `\n\n_…and ${lines.length - included - 1} more_`;
            const projected = header.length + candidate.length + truncatedHint.length;

            if (projected > DISCORD_EMBED_DESCRIPTION_LIMIT) {
                break;
            }

            body = candidate;
            included++;
        }

        if (included < lines.length) {
            const remaining = lines.length - included;
            return `${header}${body}\n\n_…and ${remaining} more_`;
        }

        return `${header}${body}`;
    }

    private getChangeUrl(update: MuseWikiChangeUpdate): string {
        const titlePath = encodeURIComponent(update.title.replace(/ /g, "_"));

        if (update.change_type === "edit" && update.old_revid) {
            return `https://musewiki.org/index.php?title=${titlePath}&diff=${update.id}&oldid=${update.old_revid}`;
        }

        if (update.change_type === "new") {
            return `https://musewiki.org/index.php?title=${titlePath}&oldid=${update.id}`;
        }

        return `https://musewiki.org/${titlePath}`;
    }

    private getChangeIcon(changeType: "edit" | "new" | "log"): string {
        switch (changeType) {
            case "new":
                return "📝";
            case "edit":
                return "✏️";
            case "log":
                return "📋";
            default:
                return "•";
        }
    }

    private getColorForBatch(updates: MuseWikiChangeUpdate[]): number {
        const counts = { new: 0, edit: 0, log: 0 };
        for (const u of updates) {
            counts[u.change_type]++;
        }

        if (counts.new >= counts.edit && counts.new >= counts.log) {
            return 0x4CAF50;
        }

        if (counts.log > counts.edit) {
            return 0xFFC107;
        }

        return 0x2196F3;
    }

    private escapeMarkdown(text: string): string {
        return text.replace(/([\\`*_~|[\]])/g, "\\$1");
    }
}
