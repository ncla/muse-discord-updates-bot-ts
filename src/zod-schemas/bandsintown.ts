import { z } from "zod";

export const BandsintownVenueSchema = z.object({
    name: z.string(),
    location: z.string(),
});

export const BandsintownEventSchema = z.object({
    id: z.string(),
    url: z.string().url(),
    starts_at: z.string(),
    venue: BandsintownVenueSchema,
});

export const BandsintownEventsResponseSchema = z.array(BandsintownEventSchema);
