import {UpdateType} from "./message-manager";

export enum WebhookService {
    Discord,
}

export type UpdateAuthor = {
    id: string | null;
    name: string | null;
    image_url: string | null;
}

// TODO: better not to have optional properties and have them always present?
export interface Update {
    type: UpdateType;
    id: string;
    content?: string | null;
    url?: string | null;
    image_url?: string | null;
    created_at_timestamp?: string | null;
    author?: UpdateAuthor | null;
}

export interface UnprocessedUpdateEntry extends Update {
    isNew: boolean | null;
}