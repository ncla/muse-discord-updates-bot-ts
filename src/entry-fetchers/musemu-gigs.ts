import {EntryFetcher} from "@/src/entry-fetchers/index";
import {MuseMuGigsUpdate, UpdateType} from "@/src/updates";
import {BandsintownEventsResponseSchema} from "@/src/zod-schemas/bandsintown";
import {createResponseError} from "@/src/common";

export class MusemuGigs implements EntryFetcher
{
    private readonly appId = '6e61950a28c04550457cfa0fd3a4e5ef';
    private readonly artistId = '143';

    async fetch(): Promise<MuseMuGigsUpdate[]>
    {
        const url = new URL(`https://rest.bandsintown.com/V4/artists/id_${this.artistId}/events/`);
        url.searchParams.set('app_id', this.appId);

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw await createResponseError(response, 'Bandsintown request failed');
        }

        const events = BandsintownEventsResponseSchema.parse(await response.json());

        return events.map((event): MuseMuGigsUpdate => {
            let title = `${event.venue.name.trim()}, ${event.venue.location.trim()}`;

            if (title.endsWith(',')) {
                title = title.slice(0, -1);
            }

            const eventUrl = new URL(event.url);

            return {
                type: UpdateType.MUSEMU_GIG,
                uniqueId: event.id,
                id: event.id,
                title,
                url: `${eventUrl.origin}${eventUrl.pathname}`,
                event_date: new Date(`${event.starts_at}Z`),
            };
        });
    }
}
