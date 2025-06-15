import {BaseUpdate} from "@/src/updates";

export interface EntryFetcher {
    fetch(): Promise<BaseUpdate[]>;
}