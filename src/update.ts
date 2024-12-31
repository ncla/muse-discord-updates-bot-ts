import {UpdateType} from "./message-manager";

export enum WebhookService {
    Discord,
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
    created_at_timestamp?: string | null;
    author?: UpdateAuthor | null;
}

export interface Update extends OptionalUpdateFields {
    type: UpdateType;
    id: string;
}

export interface UnprocessedUpdateEntry extends Update {
    isNew: boolean | null;
}

export function createBlankUpdate(): OptionalUpdateFields
{
    return {
        parent_id: null,
        title: null,
        parent_title: null,
        content: null,
        url: null,
        image_url: null,
        created_at_timestamp: null,
        author: {
            id: null,
            name: null,
            image_url: null,
        }
    }
}