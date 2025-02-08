import {BaseUpdate, Update} from "@/src/updates";

export interface EntryFetcher {
    fetch(): Promise<BaseUpdate[]>;
}