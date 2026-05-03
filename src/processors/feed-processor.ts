import {EntryFetcher} from "@/src/entry-fetchers";
import {IUpdatesRepository} from "@/src/repositories/updates-repository";
import {getBatchTransformer, getTransformer} from "@/src/updates/transformers";
import {
    WebhookExecuteRequestor
} from "@/src/webhook-requestor";
import {DoubleRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {BaseUpdate, UpdateType, WebhookService, WebhookServiceBodyMap, WebhookServiceResponseMap} from "@/src/updates";
import {PromiseResult} from "@/src/types/promises";
import {FeedProcessorSummary, FetcherSummary, WebhookRequestSummary} from "../types/feed-processor";
import * as Sentry from "@sentry/node";
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export enum FetcherExecutionMode {
    Parallel = 'parallel',
    Sequential = 'sequential'
}

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
        protected queueActionManager: DoubleRateLimitedActionableQueueManager<WebhookServiceResponseMap[WS]>,
        protected executionMode: FetcherExecutionMode = FetcherExecutionMode.Parallel
    ) {
        return this
    }

    async process(): Promise<FeedProcessorSummary<WebhookServiceBodyMap[WS], WebhookServiceResponseMap[WS]>>
    {
        console.info('Running feed fetchers..')
        console.info(`Execution mode: ${this.executionMode}`)

        const requestPromises: Promise<PromiseResult<WebhookServiceResponseMap[WS]>>[] = []

        const fetcherSummaries: FetcherSummary<WebhookServiceBodyMap[WS]>[] = this.entryFetchers.map(fetcher => {
            return {
                name: fetcher.constructor.name,
                entries: [],
                entriesInDatabaseAlready: [],
                entriesProcessed: [],
                entriesTransformed: [],
                errors: []
            }
        })

        const webhookRequestSummary: WebhookRequestSummary<WebhookServiceResponseMap[WS]> = {
            webhookService: this.webhookService,
            responses: [],
            errors: []
        }

        if (this.executionMode === FetcherExecutionMode.Parallel) {
            await Promise.allSettled(
                this.entryFetchers.map((fetcher, fetcherIndex) => 
                    this.processFetcher(fetcher, fetcherIndex, fetcherSummaries, webhookRequestSummary, requestPromises)
                )
            )
        } else {
            for (let fetcherIndex = 0; fetcherIndex < this.entryFetchers.length; fetcherIndex++) {
                await this.processFetcher(
                    this.entryFetchers[fetcherIndex], 
                    fetcherIndex, 
                    fetcherSummaries, 
                    webhookRequestSummary, 
                    requestPromises
                )
            }
        }

        await Promise.all(requestPromises)

        this.queueActionManager.stopWorker()

        await this.cleanupTemporaryFiles()

        return {
            fetcherSummaries,
            webhookRequestSummary
        }
    }

    private async processFetcher(
        fetcher: EntryFetcher,
        fetcherIndex: number,
        fetcherSummaries: FetcherSummary<WebhookServiceBodyMap[WS]>[],
        webhookRequestSummary: WebhookRequestSummary<WebhookServiceResponseMap[WS]>,
        requestPromises: Promise<PromiseResult<WebhookServiceResponseMap[WS]>>[]
    ): Promise<void> {
        try {
            const updates = await fetcher.fetch()

            console.log(`Fetched ${updates.length} updates from ${fetcher.constructor.name}`)

            fetcherSummaries[fetcherIndex].entries = updates

            const newEntriesByType = new Map<UpdateType, BaseUpdate[]>()

            await Promise.allSettled(
                updates.map(async update => {
                    try {
                        const persisted = await this.persistUpdateEntry(update)

                        if (!persisted) {
                            fetcherSummaries[fetcherIndex].entriesInDatabaseAlready.push(update)
                            return
                        }

                        const existing = newEntriesByType.get(update.type)
                        if (existing) {
                            existing.push(update)
                        } else {
                            newEntriesByType.set(update.type, [update])
                        }
                    } catch (error) {
                        this.recordError(error, fetcherSummaries[fetcherIndex].errors)
                    }
                })
            )

            for (const [updateType, entries] of newEntriesByType) {
                const batchTransformer = entries.length > 1
                    ? getBatchTransformer(this.webhookService, updateType)
                    : undefined

                if (batchTransformer !== undefined) {
                    try {
                        const bodies = batchTransformer.transformBatch(entries) as WebhookServiceBodyMap[WS][]

                        for (const entry of entries) {
                            fetcherSummaries[fetcherIndex].entriesProcessed.push(entry)
                        }

                        for (const body of bodies) {
                            fetcherSummaries[fetcherIndex].entriesTransformed.push(body)
                            this.queueWebhookSend(body, requestPromises, webhookRequestSummary)
                        }
                    } catch (error) {
                        this.recordError(error, fetcherSummaries[fetcherIndex].errors)
                    }
                    continue
                }

                const entryTransformer = getTransformer(this.webhookService, updateType)

                for (const entry of entries) {
                    try {
                        const body = entryTransformer.transform(entry) as WebhookServiceBodyMap[WS]

                        fetcherSummaries[fetcherIndex].entriesProcessed.push(entry)
                        fetcherSummaries[fetcherIndex].entriesTransformed.push(body)
                        this.queueWebhookSend(body, requestPromises, webhookRequestSummary)
                    } catch (error) {
                        this.recordError(error, fetcherSummaries[fetcherIndex].errors)
                    }
                }
            }
        } catch (error) {
            this.recordError(error, fetcherSummaries[fetcherIndex].errors)
        }
    }

    private recordError(error: unknown, errors: Error[]): void
    {
        if (error instanceof Error) {
            errors.push(error)
            Sentry.captureException(error);
        } else {
            const unknownError = new Error('Unknown error occurred')
            errors.push(unknownError)
            Sentry.captureException(unknownError);
        }
    }

    private async persistUpdateEntry(entry: BaseUpdate): Promise<boolean>
    {
        console.info(`Processing update entry: ${entry.type} – ${entry.uniqueId}`)

        const existingEntry = await this.updatesRepository.findByTypeAndUniqueId(
            entry.type,
            entry.uniqueId
        )

        if (existingEntry !== undefined) {
            console.info(`Entry already exists, skipping: ${entry.type} – ${entry.uniqueId}`)
            return false
        }

        const newEntry = <CreateUpdateRecordType>{
            type: entry.type,
            unique_id: entry.uniqueId,
            data: entry
        }

        console.info(`Creating new entry: ${entry.type} – ${entry.uniqueId}`)

        this.updatesRepository.create(newEntry)

        console.info(`Created entry in database: ${entry.type} – ${entry.uniqueId}`)

        return true
    }

    private queueWebhookSend(
        body: WebhookServiceBodyMap[WS],
        requestPromises: Promise<PromiseResult<WebhookServiceResponseMap[WS]>>[],
        webhookRequestSummary: WebhookRequestSummary<WebhookServiceResponseMap[WS]>
    ): void {
        requestPromises.push(
            this.queueActionManager.queue(
                () => this.webhookExecuteRequestor.send(body)
            ).then(result => {
                if (result.status === 'rejected') {
                    webhookRequestSummary.errors.push(result.reason)
                    Sentry.captureException(result.reason);
                } else if (result.status === 'fulfilled') {
                    webhookRequestSummary.responses.push(result.value)
                }

                return result
            })
        )
    }

    private async cleanupTemporaryFiles(): Promise<void> {
        console.info('Cleaning up temporary screenshot files...')
        
        const tempDir = path.join(os.tmpdir(), 'muse-discord-bot')
        
        try {
            const files = await fs.readdir(tempDir)
            
            if (files.length > 0) {
                const cleanupPromises = files.map(async (filename) => {
                    const filePath = path.join(tempDir, filename)
                    try {
                        await fs.unlink(filePath)
                        console.info(`Cleaned up temporary file: ${filePath}`)
                    } catch (error) {
                        console.warn(`Failed to cleanup file ${filePath}:`, error)
                    }
                })
                
                await Promise.allSettled(cleanupPromises)
            }
            
            await fs.rmdir(tempDir)
            console.info(`Removed temporary directory: ${tempDir}`)
        } catch (error: unknown) {
            console.warn('Failed to cleanup temporary directory:', error)
        }
        
        console.info('Temporary file cleanup completed')
    }
}
