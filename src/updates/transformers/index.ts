import {WebhookMessageCreateOptions} from "discord.js";
import {Update, UpdateType, WebhookService} from "../../update";
import {Json as DefaultJsonDiscordTransformer} from "./discord/json";
import {YoutubeUpload as YoutubeUploadsTransformer} from "./discord/youtube-upload";
import {YoutubePlaylistVideo} from "./discord/youtube-playlist-video";

export interface UpdateTransformer<BodyType> {
    transform(update: Update): BodyType;
}

export interface DiscordUpdateTransformer extends UpdateTransformer<WebhookMessageCreateOptions> {}

export interface SlackUpdateTransformer extends UpdateTransformer<string> {}

// Can be other types of transformers. For now, only Discord is supported.
export function getTransformer(
    webhookService: WebhookService,
    updateType: UpdateType
): DiscordUpdateTransformer | SlackUpdateTransformer {
    switch (webhookService) {
        case WebhookService.Discord:
            switch (updateType) {
                case UpdateType.YOUTUBE_UPLOAD:
                    return new YoutubeUploadsTransformer
                case UpdateType.YOUTUBE_PLAYLIST_VIDEO:
                    return new YoutubePlaylistVideo
                default:
                    return new DefaultJsonDiscordTransformer
            }
        default:
            throw new Error(`No transformers available for service ${updateType}`);
    }
}