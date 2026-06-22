import {EntryFetcher} from "@/src/entry-fetchers/index";
import {createBlankUpdate, Muse1420mhzDeployUpdate, UpdateType} from "@/src/updates";
import {createResponseError} from "@/src/common";

export class Muse1420mhzDeploy implements EntryFetcher
{
    private readonly siteUrl = 'https://1420mhz.muse.mu/'

    async fetch(): Promise<Muse1420mhzDeployUpdate[]>
    {
        const response = await fetch(this.siteUrl)

        if (!response.ok) {
            throw await createResponseError(response, '1420mhz.muse.mu request failed')
        }

        const html = await response.text()
        const match = html.match(/dpl_[A-Za-z0-9]+/)

        if (!match) {
            throw new Error('Deploy id not found in HTML')
        }

        const deployId = match[0]

        return [{
            ...createBlankUpdate(),
            type: UpdateType.MUSE_1420MHZ_DEPLOY,
            id: deployId,
            uniqueId: deployId,
            url: this.siteUrl,
        }]
    }
}
