import { EmbedBuilder, WebhookMessageCreateOptions } from "discord.js";
import { DiscordUpdateTransformer } from "@/src/updates/transformers";
import { MuseWikiChangeUpdate } from "@/src/updates";
import { getMentionableRoleIdString } from "@/src/updates/transformers/discord/mentionable-role";

export class MuseWikiChange implements DiscordUpdateTransformer {
    transform(wikiUpdate: MuseWikiChangeUpdate): WebhookMessageCreateOptions {
        const embed = new EmbedBuilder();
        
        // Generate diff URL for edit type, or use regular URL for new pages and logs
        let diffUrl;
        if (wikiUpdate.change_type === 'edit' && wikiUpdate.old_revid) {
            diffUrl = `https://musewiki.org/index.php?title=${encodeURIComponent(wikiUpdate.title.replace(/ /g, '_'))}&diff=${wikiUpdate.id}&oldid=${wikiUpdate.old_revid}`;
        } else if (wikiUpdate.change_type === 'new') {
            // For new pages, link to the first revision
            diffUrl = `https://musewiki.org/index.php?title=${encodeURIComponent(wikiUpdate.title.replace(/ /g, '_'))}&oldid=${wikiUpdate.id}`;
        } else {
            // Default URL for logs or other types
            diffUrl = `https://musewiki.org/${encodeURIComponent(wikiUpdate.title.replace(/ /g, '_'))}`;
        }
        
        embed.setTitle(wikiUpdate.title);
        embed.setURL(diffUrl);
        embed.setColor(this.getColorByChangeType(wikiUpdate.change_type));
        embed.setTimestamp(wikiUpdate.created_at);
        embed.setAuthor({
            name: wikiUpdate.user,
            url: `https://musewiki.org/User:${encodeURIComponent(wikiUpdate.user.replace(/ /g, '_'))}`
        });
        
        const changeDescription = this.getChangeDescription(wikiUpdate);
        embed.setDescription(changeDescription);
        
        if (wikiUpdate.comment) {
            embed.addFields({ 
                name: 'Comment',
                // Discord has a 1024-character limit, accounting for code block markers
                value: `\`\`\`${wikiUpdate.comment.substring(0, 1018)}\`\`\``
            });
        }
        
        if (wikiUpdate.oldlen !== undefined && wikiUpdate.newlen !== undefined) {
            const diff = wikiUpdate.newlen - wikiUpdate.oldlen;
            const diffSign = diff > 0 ? '+' : '';
            embed.addFields({ 
                name: 'Size Change', 
                value: `${wikiUpdate.oldlen} → ${wikiUpdate.newlen} (${diffSign}${diff} bytes)`, 
                inline: true 
            });
        }
        
        embed.setFooter({ 
            text: `Page ID: ${wikiUpdate.pageid} • Rev ID: ${wikiUpdate.id}`
        });
        
        const mentionRoleIdString = getMentionableRoleIdString(wikiUpdate.type);
        const message = [mentionRoleIdString].filter(Boolean).join(' ');
        
        return {
            content: message,
            embeds: [embed]
        };
    }
    
    private getColorByChangeType(changeType: 'edit' | 'new' | 'log'): number {
        switch (changeType) {
            case 'new':
                return 0x4CAF50; // Green
            case 'edit':
                return 0x2196F3; // Blue
            case 'log':
                return 0xFFC107; // Amber
            default:
                return 0x9E9E9E; // Grey
        }
    }
    
    private getChangeDescription(update: MuseWikiChangeUpdate): string {
        switch (update.change_type) {
            case 'new':
                return '📝 Created a new page';
            case 'edit':
                return '✏️ Edited an existing page';
            case 'log':
                return '📋 Performed a log action';
            default:
                return 'Made a change to the wiki';
        }
    }
}
