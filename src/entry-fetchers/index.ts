import {UnprocessedUpdateEntry} from "../update";

export interface EntryFetcher {
    fetch(): Promise<UnprocessedUpdateEntry[]>;
}