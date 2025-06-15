import {EntryFetcher} from "@/src/entry-fetchers/index";
import {createBlankUpdate, DomainCertificateUpdate, UpdateType} from "@/src/updates";
import {CertificateSchema, Certificate} from "@/src/zod-schemas/crtsh";
import {z} from "zod";

export class DomainCertificates implements EntryFetcher
{
    private domain: string | undefined;

    constructor(domain: string | undefined) {
        this.domain = domain
    }

    async fetch()
    {
        if (this.domain === undefined) {
            throw new Error('Domain is not set')
        }

        const url = new URL(`https://crt.sh/json`);
        url.searchParams.append('q', this.domain)

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();

        const CertificateArraySchema = z.array(CertificateSchema)

        const parsedJson = CertificateArraySchema.parse(json)

        const uniqueCommonNames = new Set(
            parsedJson
                .map((cert: Certificate) => cert.name_value.split('\n'))
                .flat()
        )

        return Array.from(uniqueCommonNames).map(commonName => this.mapCertificateToUpdateEntry(commonName))
    }

    private mapCertificateToUpdateEntry(domain: string): DomainCertificateUpdate
    {
        return {
            ...createBlankUpdate(),
            type: UpdateType.DOMAIN_CERTIFICATE,
            id: domain,
            uniqueId: domain,
        }
    }
}