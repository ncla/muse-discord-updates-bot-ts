export enum WebhookService {
    Discord,
}

export enum UpdateType {
    INSTAGRAM_POST = 'INSTAGRAM_POST',
    YOUTUBE_UPLOAD = 'YOUTUBE_UPLOAD',
    YOUTUBE_PLAYLIST_VIDEO = 'YOUTUBE_PLAYLIST_VIDEO',
    MUSEBOOTLEGS_TORRENT = 'MUSEBOOTLEGS_TORRENT',
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
    title: string;
    content: string | null;
    url: string | null;
    image_url: string | null;
    author: UpdateAuthor & {
        name: string | null;
    },
    created_at: Date | null;
}