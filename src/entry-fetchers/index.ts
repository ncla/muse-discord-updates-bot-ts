import {Update} from "@/src/updates";

export interface EntryFetcher {
    fetch(): Promise<Update[]>;
}