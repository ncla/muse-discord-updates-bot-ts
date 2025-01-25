import {Update} from "@/src/update";

export interface EntryFetcher {
    fetch(): Promise<Update[]>;
}