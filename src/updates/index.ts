import {WebhookMessageCreateOptions} from "discord.js";

export enum WebhookService {
    Discord,
}

export type WebhookServiceBodyMap = {
    [WebhookService.Discord]: WebhookMessageCreateOptions;
};

export type WebhookServiceResponseMap = {
    [WebhookService.Discord]: Response;
};

export enum UpdateType {
    INSTAGRAM_POST = 'INSTAGRAM_POST',
    YOUTUBE_UPLOAD = 'YOUTUBE_UPLOAD',
    YOUTUBE_PLAYLIST_VIDEO = 'YOUTUBE_PLAYLIST_VIDEO',
    MUSEBOOTLEGS_TORRENT = 'MUSEBOOTLEGS_TORRENT',
    DOMAIN_CERTIFICATE = 'DOMAIN_CERTIFICATE',
    MUSEMU_GIG = 'MUSEMU_GIG',
    MUSEMU_STORE = 'MUSEMU_STORE',
    MUSEMU_US_STORE = 'MUSEMU_US_STORE',
    WARNER_CA_STORE = 'WARNER_CA_STORE',
    WARNER_AU_STORE = 'WARNER_AU_STORE',
}

export type UpdateAuthor = {
    id: string | null;
    name: string | null;
    image_url: string | null;
}

export type OptionalUpdateFields = {
    parent_id?: string | null;
    title?: string | null;
    parent_title?: string | null;
    content?: string | null;
    url?: string | null;
    image_url?: string | null;
    created_at?: Date | null;
    author?: UpdateAuthor | null;
}

export type BaseUpdate = {
    type: UpdateType;
    uniqueId: string;
    id: string;
}

export type Update = BaseUpdate & OptionalUpdateFields

export type EmptyUpdateEntry = OptionalUpdateFields

export function createBlankUpdate(): EmptyUpdateEntry
{
    return {
        parent_id: null,
        title: null,
        parent_title: null,
        content: null,
        url: null,
        image_url: null,
        created_at: null,
        author: {
            id: null,
            name: null,
            image_url: null,
        },
    }
}

export type YoutubeUploadUpdate = BaseUpdate & {
    type: UpdateType.YOUTUBE_UPLOAD;
    title: string;
    content: string | null;
    url: string;
    image_url: string;
    author: UpdateAuthor & {
        id: string;
        name: string;
        image_url: string;
    };
    created_at: Date;
}

export type YoutubePlaylistUpdate = BaseUpdate & {
    type: UpdateType.YOUTUBE_PLAYLIST_VIDEO;
    title: string;
    content: string | null;
    parent_title: string;
    url: string;
    image_url: string;
    author: UpdateAuthor & {
        name: string;
        image_url: string;
    }
    created_at: Date;
}

export type MuseBootlegsTorrentUpdate = BaseUpdate & {
    type: UpdateType.MUSEBOOTLEGS_TORRENT;
    title: string;
    content: string | null;
    url: string | null;
    image_url: string | null;
    author: UpdateAuthor & {
        name: string | null;
    },
    created_at: Date | null;
}

export type DomainCertificateUpdate = BaseUpdate & {
    type: UpdateType.DOMAIN_CERTIFICATE;
}

export type MuseMuGigsUpdate = BaseUpdate & {
    type: UpdateType.MUSEMU_GIG;
    title: string;
    url: string;
    event_date: Date;
}

export type MusemuStoreUpdate = BaseUpdate & {
    type: UpdateType.MUSEMU_STORE;
    id: string;
    title: string;
    url: string;
    image_url: string;
}

export type MusemuUsStoreUpdate = BaseUpdate & {
    type: UpdateType.MUSEMU_US_STORE;
    id: string;
    title: string;
    url: string;
    image_url: string;
}

export type WarnerCanadaStoreUpdate = BaseUpdate & {
    type: UpdateType.WARNER_CA_STORE;
    id: string;
    title: string;
    url: string;
    image_url: string;
}

export type WarnerAustraliaStoreUpdate = BaseUpdate & {
    type: UpdateType.WARNER_AU_STORE;
    id: string;
    title: string;
    url: string;
    image_url: string | null; // One rare store item had no image
}