import {EntryFetcher} from "@/src/entry-fetchers/index";
import config, {IConfig} from "@/src/config";
// import * as util from "node:util";
import {BaseUpdate, createBlankUpdate, Update, UpdateType, YoutubeUploadUpdate} from "@/src/updates";
import {exportHighestResolutionThumbnailUrlFromThumbnailResource} from "@/src/common";

export class YoutubeUploads implements EntryFetcher
{
    constructor(private config: IConfig) {
        return this
    }

    async fetch()
    {
        const apiKey = this.config.services.youtube.uploads_api_key

        if (apiKey === undefined) {
            throw new Error('Youtube uploads API key is not set')
        }

        const channels = this.config.fetchables.youtube.filter(channel => channel.uploads)

        if (channels.length === 0) {
            console.warn('No YouTube channels set to be fetched by uploads property')
            return []
        }

        let entries: YoutubeUploadUpdate[] = []

        for (const channel of channels) {
            let url = new URL(`https://www.googleapis.com/youtube/v3/playlistItems`);

            url.searchParams.append('playlistId', channel.uploads_playlist_id)
            url.searchParams.append('maxResults', '25')
            url.searchParams.append('part', 'snippet')
            url.searchParams.append('key', apiKey)

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            let json: GoogleApiYouTubePaginationInfo<GoogleApiYouTubePlaylistItemResource> = await response.json();

            const channelUploadEntries: YoutubeUploadUpdate[] = json.items.map((item): YoutubeUploadUpdate => {
                return this.mapPlayListItemToEntry(item, channel);
            });

            entries = [...entries, ...channelUploadEntries]
        }

        return entries;
    }

    // TODO: channel typehint seems quite heavy. type-hint without nested properties instead?
    private mapPlayListItemToEntry(
        item: GoogleApiYouTubePlaylistItemResource,
        channel: IConfig['fetchables']['youtube'][number]
    ): YoutubeUploadUpdate
    {
        return {
            ...createBlankUpdate(),
            uniqueId: `${channel.channel_id}_${item.snippet.resourceId.videoId}`,
            type: UpdateType.YOUTUBE_UPLOAD,
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            content: item.snippet.description ? item.snippet.description : null,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
            image_url: exportHighestResolutionThumbnailUrlFromThumbnailResource(item.snippet.thumbnails),
            author: {
                id: channel.channel_id,
                name: channel.username,
                image_url: channel.author_image_url,
            },
            created_at: new Date(item.snippet.publishedAt),
        }
    }
}