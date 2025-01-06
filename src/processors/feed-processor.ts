import {EntryFetcher} from "../entry-fetchers";
import {IUpdatesRepository} from "../repositories/updates-repository";
import {getTransformer, UpdateTransformer} from "../updates/transformers";
import {AbstractUpdateRequestManager} from "../request-manager";
import {WebhookService} from "../update";
import { WebhookMessageCreateOptions } from "discord.js";

export class FeedProcessor<
    CreateUpdateRecordType,
    ReturnableUpdateRecordType,
    RequestManagerBodyType extends string | WebhookMessageCreateOptions
>
{
    constructor(
        protected webhookService: WebhookService,
        protected entryFetcher: EntryFetcher[],
        protected updatesRepository: IUpdatesRepository<CreateUpdateRecordType, ReturnableUpdateRecordType>,
        protected requestManager: AbstractUpdateRequestManager<RequestManagerBodyType>
    ) {
        return this
    }

    async process()
    {
        const entriesPerFetcher = await Promise.all(
            this.entryFetcher.map(fetcher => fetcher.fetch())
        )

        let entries = entriesPerFetcher.flat()

        for (const entry of entries) {
            const existingEntry = await this.updatesRepository.findByTypeAndUniqueId(
                entry.type,
                entry.uniqueId
            )

            if (existingEntry === undefined) {
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
            }
        }

        this.requestManager.sendAll()
    }
}