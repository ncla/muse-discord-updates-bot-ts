import {z} from "zod";

export const CertificateSchema = z.object({
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

export type Certificate = z.infer<typeof CertificateSchema>
