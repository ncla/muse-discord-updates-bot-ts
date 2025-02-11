import {EntryFetcher} from "@/src/entry-fetchers";
import {IUpdatesRepository} from "@/src/repositories/updates-repository";
import {getTransformer} from "@/src/updates/transformers";
import {AbstractUpdateRequestManager} from "@/src/request-manager";
import {BaseUpdate, Update, WebhookService} from "@/src/updates";
import {WebhookMessageCreateOptions} from "discord.js";

export class FeedProcessor<
    CreateUpdateRecordType,
    ReturnableUpdateRecordType,
    RequestManagerBodyType extends string | WebhookMessageCreateOptions
>
{
    constructor(
        protected webhookService: WebhookService,
        protected entryFetchers: EntryFetcher[],
        protected updatesRepository: IUpdatesRepository<CreateUpdateRecordType, ReturnableUpdateRecordType>,
        protected requestManager: AbstractUpdateRequestManager<RequestManagerBodyType>
    ) {
        return this
    }

    async process()
    {
        console.info('Running feed fetchers..')

        const fetcherResults: PromiseSettledResult<BaseUpdate[]>[] = await Promise.allSettled(
            this.entryFetchers.map(async fetcher => {
                return await fetcher.fetch()
            })
        )

        console.info('Feed fetchers finished running..')

        const successfulFetcherResults = fetcherResults.filter(result => result.status === 'fulfilled')
        const failedFetcherResults = fetcherResults.filter(result => result.status === 'rejected')

        console.info(`Successful fetchers: ${successfulFetcherResults.length}`)

        if (failedFetcherResults.length > 0) {
            // Increase verbosity of error messages
            console.warn(`Failed fetchers: ${failedFetcherResults.length}`)

            for (const failedFetcher of failedFetcherResults) {
                console.error(failedFetcher.reason)
            }
        }

        let entries = successfulFetcherResults
            .map(result => result.value)
            .flat()

        console.info(`Total update entries: ${entries.length}`)

        for (const entry of entries) {
            try {
                console.info(`Processing update entry: ${entry.type} – ${entry.uniqueId}`)

                const existingEntry = await this.updatesRepository.findByTypeAndUniqueId(
                    entry.type,
                    entry.uniqueId
                )

                if (existingEntry !== undefined) {
                    console.info(`Entry already exists, skipping: ${entry.type} – ${entry.uniqueId}`)
                    continue
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
                const entryRequestBody = entryTransformer.transform(entry)

                console.info(`Adding transformed entry to request manager: ${entry.type} – ${entry.uniqueId}`)

                // TODO: Asserting type here is not ideal.
                this.requestManager.add(entryRequestBody as RequestManagerBodyType)
            } catch (error) {
                console.error(`Failed to process entry: ${error}`)
            }
        }

        console.info('Sending all requests.')

        if (this.requestManager.count() > 0) {
            return this.requestManager.sendAll()
        }
    }
}