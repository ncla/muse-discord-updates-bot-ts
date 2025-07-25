import {WebhookMessageCreateOptions} from "discord.js";
import {BaseUpdate, UpdateType, WebhookService} from "@/src/updates";
import {Json as DefaultJsonDiscordTransformer} from "@/src/updates/transformers/discord/json";
import {YoutubeUpload as YoutubeUploadsTransformer} from "@/src/updates/transformers/discord/youtube-upload";
import {YoutubePlaylistVideo} from "@/src/updates/transformers/discord/youtube-playlist-video";
import {MusebootlegsTorrent} from "@/src/updates/transformers/discord/musebootlegs-torrent";
import {DomainCertificate} from "@/src/updates/transformers/discord/domain-certificate";
import {MusemuGig} from "@/src/updates/transformers/discord/musemu-gig";
import {Store} from "@/src/updates/transformers/discord/store";
import {MuseWikiChange} from "@/src/updates/transformers/discord/musewiki-change";
import {FacebookAd} from "@/src/updates/transformers/discord/facebook-ad";
import {SpotifyPlaylist} from "@/src/updates/transformers/discord/spotify-playlist";
import {StoreRegion} from "@/src/types/common";

export interface UpdateTransformer<BodyType> {
    transform(update: BaseUpdate): BodyType;
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
                case UpdateType.MUSEBOOTLEGS_TORRENT:
                    return new MusebootlegsTorrent
                case UpdateType.DOMAIN_CERTIFICATE:
                    return new DomainCertificate
                case UpdateType.MUSEMU_GIG:
                    return new MusemuGig
                case UpdateType.MUSEMU_STORE:
                    return new Store(StoreRegion.EU)
                case UpdateType.MUSEMU_US_STORE:
                    return new Store(StoreRegion.US)
                case UpdateType.WARNER_CA_STORE:
                    return new Store(StoreRegion.CA)
                case UpdateType.WARNER_AU_STORE:
                    return new Store(StoreRegion.AU)
                case UpdateType.MUSEWIKI_CHANGE:
                    return new MuseWikiChange()
                case UpdateType.FACEBOOK_AD:
                    return new FacebookAd()
                case UpdateType.SPOTIFY_PLAYLIST:
                    return new SpotifyPlaylist()
                default:
                    return new DefaultJsonDiscordTransformer
            }
        default:
            throw new Error(`No transformers available for service ${updateType}`);
    }
}