import {Update} from "../update";

export interface EntryFetcher {
    fetch(): Promise<Update[]>;
}