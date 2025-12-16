import {EntryFetcher} from "@/src/entry-fetchers/index";
import {IConfig} from "@/src/config";
import {createBlankUpdate, UpdateType, YoutubeTopicVideoUpdate} from "@/src/updates";
import {exportHighestResolutionThumbnailUrlFromThumbnailResource} from "@/src/common";

export class YoutubeTopicChannel implements EntryFetcher
{
    constructor(
        private apiKey: string | undefined,
        private fetchables: IConfig['fetchables']['youtube_topic_channels']
    ) {
        return this
    }

    async fetch()
    {
        if (this.apiKey === undefined) {
            throw new Error('Youtube API key is not set')
        }

        if (!Array.isArray(this.fetchables)) {
            throw new Error('Youtube topic channel fetchables are not set')
        }

        const channels = this.fetchables.filter(channel => channel.enabled)

        if (channels.length === 0) {
            console.warn('No YouTube topic channels set to be fetched')
            return []
        }

        let entries: YoutubeTopicVideoUpdate[] = []

        for (const channel of channels) {
            const uploadsPlaylistId = this.getUploadsPlaylistId(channel.channel_id)
            const channelEntries = await this.fetchAllPlaylistItems(uploadsPlaylistId, channel)
            entries = [...entries, ...channelEntries]
        }

        return entries;
    }

    private async fetchAllPlaylistItems(
        playlistId: string,
        channel: IConfig['fetchables']['youtube_topic_channels'][number]
    ): Promise<YoutubeTopicVideoUpdate[]>
    {
        const allEntries: YoutubeTopicVideoUpdate[] = []
        let pageToken: string | undefined = undefined

        while (true) {
            const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');

            url.searchParams.append('playlistId', playlistId)
            url.searchParams.append('maxResults', '50')
            url.searchParams.append('part', 'snippet,contentDetails')
            url.searchParams.append('key', this.apiKey!)

            if (pageToken) {
                url.searchParams.append('pageToken', pageToken)
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const json: GoogleApiYouTubePaginationInfo<GoogleApiYouTubePlaylistItemResource> = await response.json();

            const pageEntries: YoutubeTopicVideoUpdate[] = json.items.map((item): YoutubeTopicVideoUpdate => {
                return this.mapPlayListItemToEntry(item, channel);
            });

            allEntries.push(...pageEntries)

            if (json.nextPageToken) {
                pageToken = json.nextPageToken
            } else {
                break
            }
        }

        return allEntries
    }

    private getUploadsPlaylistId(channelId: string): string
    {
        return 'UU' + channelId.slice(2);
    }

    private mapPlayListItemToEntry(
        item: GoogleApiYouTubePlaylistItemResource,
        channel: IConfig['fetchables']['youtube_topic_channels'][number]
    ): YoutubeTopicVideoUpdate
    {
        return {
            ...createBlankUpdate(),
            uniqueId: `topic_${channel.channel_id}_${item.snippet.resourceId.videoId}`,
            type: UpdateType.YOUTUBE_TOPIC_VIDEO,
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
