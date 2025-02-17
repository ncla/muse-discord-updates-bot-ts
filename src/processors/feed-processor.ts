import {EntryFetcher} from "@/src/entry-fetchers";
import {IUpdatesRepository} from "@/src/repositories/updates-repository";
import {getTransformer} from "@/src/updates/transformers";
import {
    WebhookExecuteRequestor
} from "@/src/webhook-requestor";
import {FixedWindowRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {BaseUpdate, WebhookService, WebhookServiceBodyMap, WebhookServiceResponseMap} from "@/src/updates";
import {PromiseResult} from "@/src/types/promises";
import {FeedProcessorSummary, FetcherSummary, WebhookRequestSummary} from "../types/feed-processor";

export class FeedProcessor<
    CreateUpdateRecordType,
    ReturnableUpdateRecordType,
    WS extends WebhookService
>
{
    constructor(
        protected webhookService: WS,
        protected entryFetchers: EntryFetcher[],
        protected updatesRepository: IUpdatesRepository<CreateUpdateRecordType, ReturnableUpdateRecordType>,
        protected webhookExecuteRequestor: WebhookExecuteRequestor<WebhookServiceBodyMap[WS], WebhookServiceResponseMap[WS]>,
        protected queueActionManager: FixedWindowRateLimitedActionableQueueManager<WebhookServiceResponseMap[WS]>
    ) {
        return this
    }

    async process(): Promise<FeedProcessorSummary<WebhookServiceBodyMap[WS], WebhookServiceResponseMap[WS]>>
    {
        console.info('Running feed fetchers..')

        let requestPromises: Promise<PromiseResult<WebhookServiceResponseMap[WS]>>[] = []

        let fetcherSummaries: FetcherSummary<WebhookServiceBodyMap[WS]>[] = this.entryFetchers.map(fetcher => {
            return {
                name: fetcher.constructor.name,
                entries: [],
                entriesInDatabaseAlready: [],
                entriesProcessed: [],
                entriesTransformed: []
            }
        })

        let webhookRequestSummary: WebhookRequestSummary<WebhookServiceResponseMap[WS]> = {
            webhookService: this.webhookService,
            responses: []
        }

        await Promise.allSettled(
            this.entryFetchers.map(async (fetcher, fetcherIndex) => {
                const updates = await fetcher.fetch()

                console.log(`Fetched ${updates.length} updates from ${fetcher.constructor.name}`)

                fetcherSummaries[fetcherIndex].entries = updates

                return Promise.allSettled(
                    updates.map(async update => {
                        const transformedEntry = await this.processUpdateEntry(update)

                        if (transformedEntry === undefined) {
                            fetcherSummaries[fetcherIndex].entriesInDatabaseAlready.push(update)
                            return
                        }

                        fetcherSummaries[fetcherIndex].entriesProcessed.push(update)
                        fetcherSummaries[fetcherIndex].entriesTransformed.push(transformedEntry)

                        requestPromises.push(
                            this.queueActionManager.queue(
                                () => this.webhookExecuteRequestor.send(transformedEntry)
                            ).then(response => {
                                webhookRequestSummary.responses.push(response)

                                return response
                            })
                        )
                    })
                )
            })
        )

        await Promise.all(requestPromises)

        return {
            fetcherSummaries,
            webhookRequestSummary
        }
    }

    private async processUpdateEntry(entry: BaseUpdate): Promise<WebhookServiceBodyMap[WS] | undefined>
    {
        console.info(`Processing update entry: ${entry.type} – ${entry.uniqueId}`)

        const existingEntry = await this.updatesRepository.findByTypeAndUniqueId(
            entry.type,
            entry.uniqueId
        )

        if (existingEntry !== undefined) {
            console.info(`Entry already exists, skipping: ${entry.type} – ${entry.uniqueId}`)
            return
        }

        const newEntry = <CreateUpdateRecordType>{
            type: entry.type,
            unique_id: entry.uniqueId,
            data: entry
        }

        console.info(`Creating new entry: ${entry.type} – ${entry.uniqueId}`)

        this.updatesRepository.create(newEntry)

        console.info(`Created entry in database: ${entry.type} – ${entry.uniqueId}`)

        const entryTransformer = getTransformer(this.webhookService, entry.type)
        return entryTransformer.transform(entry) as WebhookServiceBodyMap[WS]
    }
}