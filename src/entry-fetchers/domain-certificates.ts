import {EntryFetcher} from "@/src/entry-fetchers/index";
import {z} from "zod";
import {createBlankUpdate, DomainCertificateUpdate, UpdateType} from "@/src/updates";

const CertificateSchema = z.object({
    issuer_ca_id: z.number(),
    issuer_name: z.string(),
    common_name: z.string(),
    name_value: z.string(),
    id: z.number(),
    entry_timestamp: z.string(),
    not_before: z.string(),
    not_after: z.string(),
    serial_number: z.string(),
    result_count: z.number(),
})

type Certificate = z.infer<typeof CertificateSchema>

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