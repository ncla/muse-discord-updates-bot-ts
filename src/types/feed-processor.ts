import {BaseUpdate, WebhookService} from "@/src/updates";
import {PromiseResult} from "@/src/types/promises";

export type FetcherSummary<EntryTransformedType> = {
    name: string
    entries: BaseUpdate[]
    entriesInDatabaseAlready: BaseUpdate[]
    entriesProcessed: BaseUpdate[],
    entriesTransformed: EntryTransformedType[]
}

export type WebhookRequestSummary<WebhookResponseType> = {
    webhookService: WebhookService
    responses: PromiseResult<WebhookResponseType>[]
}

export type FeedProcessorSummary<EntryTransformedType, WebhookResponseType> = {
    fetcherSummaries: FetcherSummary<EntryTransformedType>[]
    webhookRequestSummary: WebhookRequestSummary<WebhookResponseType>
}