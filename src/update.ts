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

export interface OptionalUpdateFields {
    parent_id?: string | null;
    title?: string | null;
    parent_title?: string | null;
    content?: string | null;
    url?: string | null;
    image_url?: string | null;
    created_at?: Date | null;
    author?: UpdateAuthor | null;
}

export interface Update extends OptionalUpdateFields {
    type: UpdateType;
    uniqueId: string;
    id: string;
}

export interface EmptyUnprocessedUpdateEntry extends OptionalUpdateFields {}

export function createBlankUnprocessedUpdate(): EmptyUnprocessedUpdateEntry
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