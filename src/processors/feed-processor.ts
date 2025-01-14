import {EntryFetcher} from "../entry-fetchers";
import {IUpdatesRepository} from "../repositories/updates-repository";
import {getTransformer} from "../updates/transformers";
import {AbstractUpdateRequestManager} from "../request-manager";
import {UnprocessedUpdateEntry, WebhookService} from "../update";
import {WebhookMessageCreateOptions} from "discord.js";
import {FulfilledPromise, PromiseResult, RejectedPromise} from "../types/promises";

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
        const fetcherResults: PromiseResult<UnprocessedUpdateEntry[]>[] = await Promise.all(
            this.entryFetchers.map(async fetcher => {
                try {
                    return <FulfilledPromise<UnprocessedUpdateEntry[]>>{
                        status: 'fulfilled',
                        value: await fetcher.fetch()
                    }
                } catch (error) {
                    return <RejectedPromise>{
                        status: 'rejected',
                        reason: error
                    }
                }
            })
        )

        const successfulFetcherResults = fetcherResults.filter(result => result.status === 'fulfilled')
        const failedFetcherResults = fetcherResults.filter(result => result.status === 'rejected')

        if (failedFetcherResults.length > 0) {
            console.warn(`Failed fetchers: ${failedFetcherResults.map(failedFetcher => failedFetcher.reason)}`)
        }

        let entries = successfulFetcherResults
            .map(result => result.value)
            .flat()

        for (const entry of entries) {
            try {
                const existingEntry = await this.updatesRepository.findByTypeAndUniqueId(
                    entry.type,
                    entry.uniqueId
                )

                if (existingEntry !== undefined) {
                    continue
                }

                const newEntry = <CreateUpdateRecordType>{
                    type: entry.type,
                    unique_id: entry.uniqueId,
                    data: entry
                }

                this.updatesRepository.create(newEntry)

                const entryTransformer = getTransformer(this.webhookService, entry.type)
                const entryRequestBody = entryTransformer.transform(entry)

                // TODO: Asserting type here is not ideal.
                this.requestManager.add(entryRequestBody as RequestManagerBodyType)
            } catch (error) {
                console.error(`Failed to process entry: ${error}`)
            }
        }

        if (this.requestManager.count() > 0) {
            return this.requestManager.sendAll()
        }
    }
}