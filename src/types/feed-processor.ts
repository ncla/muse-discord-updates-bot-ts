import {BaseUpdate, WebhookService} from "@/src/updates";

export type FetcherSummary<EntryTransformedType> = {
    name: string
    entries: BaseUpdate[]
    entriesInDatabaseAlready: BaseUpdate[]
    entriesProcessed: BaseUpdate[],
    entriesTransformed: EntryTransformedType[],
    errors: Error[]
}

export type WebhookRequestSummary<WebhookResponseType> = {
    webhookService: WebhookService
    responses: WebhookResponseType[]
    errors: Error[]
}

export type FeedProcessorSummary<EntryTransformedType, WebhookResponseType> = {
    fetcherSummaries: FetcherSummary<EntryTransformedType>[]
    webhookRequestSummary: WebhookRequestSummary<WebhookResponseType>
}