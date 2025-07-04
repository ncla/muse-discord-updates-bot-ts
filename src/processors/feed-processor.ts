import {EntryFetcher} from "@/src/entry-fetchers";
import {IUpdatesRepository} from "@/src/repositories/updates-repository";
import {getTransformer} from "@/src/updates/transformers";
import {
    WebhookExecuteRequestor
} from "@/src/webhook-requestor";
import {DoubleRateLimitedActionableQueueManager} from "@/src/action-queue-manager";
import {BaseUpdate, WebhookService, WebhookServiceBodyMap, WebhookServiceResponseMap} from "@/src/updates";
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

            await Promise.allSettled(
                updates.map(async update => {
                    try {
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
                            ).then(result => {
                                if (result.status === 'rejected') {
                                    webhookRequestSummary.errors.push(result.reason)
                                    // Report webhook request failures to Sentry
                                    Sentry.captureException(result.reason);
                                } else if (result.status === 'fulfilled') {
                                    webhookRequestSummary.responses.push(result.value)
                                }

                                return result
                            })
                        )

                        return
                    } catch (error) {
                        // To make TypeScript happy
                        if (error instanceof Error) {
                            fetcherSummaries[fetcherIndex].errors.push(error)
                            Sentry.captureException(error);
                        } else {
                            const unknownError = new Error('Unknown error occurred');
                            fetcherSummaries[fetcherIndex].errors.push(unknownError)
                            Sentry.captureException(unknownError);
                        }
                    }
                })
            )
        } catch (error) {
            // To make TypeScript happy
            if (error instanceof Error) {
                fetcherSummaries[fetcherIndex].errors.push(error)
                Sentry.captureException(error);
            } else {
                const unknownError = new Error('Unknown error occurred');
                fetcherSummaries[fetcherIndex].errors.push(unknownError)
                Sentry.captureException(unknownError);
            }
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
