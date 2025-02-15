import {EntryFetcher} from "@/src/entry-fetchers";
import {IUpdatesRepository} from "@/src/repositories/updates-repository";
import {getTransformer} from "@/src/updates/transformers";
import {
    WebhookExecuteRequestor
} from "@/src/webhook-requestor";
import {FixedWindowRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {BaseUpdate, WebhookService} from "@/src/updates";
import {PromiseResult} from "@/src/types/promises";

export class FeedProcessor<
    CreateUpdateRecordType,
    ReturnableUpdateRecordType,
    RequestManagerBodyType,
    QueueableActionReturnType
>
{
    constructor(
        protected webhookService: WebhookService,
        protected entryFetchers: EntryFetcher[],
        protected updatesRepository: IUpdatesRepository<CreateUpdateRecordType, ReturnableUpdateRecordType>,
        protected webhookExecuteRequestor: WebhookExecuteRequestor<RequestManagerBodyType, QueueableActionReturnType>,
        protected queueActionManager: FixedWindowRateLimitedActionableQueueManager<QueueableActionReturnType>
    ) {
        return this
    }

    async process()
    {
        console.info('Running feed fetchers..')

        let requestPromises: Promise<PromiseResult<QueueableActionReturnType>>[] = []

        await Promise.allSettled(
            this.entryFetchers.map(async fetcher => {
                const updates = await fetcher.fetch()

                console.log(`Fetched ${updates.length} updates from ${fetcher.constructor.name}`)

                return Promise.allSettled(
                    updates.map(async update => {
                        const transformedEntry = await this.processUpdateEntry(update)

                        if (transformedEntry === undefined) {
                            return
                        }

                        requestPromises.push(
                            this.queueActionManager.queue(
                                () => this.webhookExecuteRequestor.send(transformedEntry as RequestManagerBodyType) // TODO: 💩
                            )
                        )
                    })
                )
            })
        )

        return await Promise.all(requestPromises)
    }

    private async processUpdateEntry(entry: BaseUpdate)
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
        return entryTransformer.transform(entry)
    }
}