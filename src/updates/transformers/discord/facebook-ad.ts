import { EmbedBuilder, WebhookMessageCreateOptions } from "discord.js";
import { DiscordUpdateTransformer } from "@/src/updates/transformers";
import { BaseUpdate, FacebookAdUpdate, UpdateType } from "@/src/updates";
import { getMentionableRoleIdString } from "@/src/updates/transformers/discord/mentionable-role";

export class FacebookAd implements DiscordUpdateTransformer {
    transform(facebookAdUpdate: FacebookAdUpdate): WebhookMessageCreateOptions {
        const embed = new EmbedBuilder();
        
        const adUrl = `https://www.facebook.com/ads/library/?id=${facebookAdUpdate.uniqueId}`;
        
        embed.setTitle(facebookAdUpdate.id);
        embed.setURL(adUrl);
        embed.setColor(0x1877F2);

        embed.setFooter({ 
            text: `Library ID: ${facebookAdUpdate.uniqueId}`
        });
        
        const mentionRoleIdString = getMentionableRoleIdString(facebookAdUpdate.type);
        const message = [mentionRoleIdString].filter(Boolean).join(' ');
        
        const result: WebhookMessageCreateOptions = {
            content: message,
            embeds: [embed]
        };
        
        if (facebookAdUpdate.screenshot) {
            const filename = `facebook-ad-${facebookAdUpdate.uniqueId}.png`;
            result.files = [{
                attachment: facebookAdUpdate.screenshot,
                name: filename
            }];
            embed.setImage(`attachment://${filename}`);
        }
        
        return result;
    }
}
