import {EntryFetcher} from "./index";
import config from "../config";
// import * as util from "node:util";
import {createBlankUpdate, UnprocessedUpdateEntry} from "../update";
import {UpdateType} from "../message-manager";

export class YoutubeUploads implements EntryFetcher
{
    async fetch()
    {
        // console.log(util.inspect(config, { depth: 5 }));

        const apiKey = config.services.youtube.uploads_api_key

        if (apiKey === undefined) {
            throw new Error('Youtube uploads API key is not set')
        }

        let entries: UnprocessedUpdateEntry[] = []

        for (const channel of config.fetchables.youtube) {
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

            const channelUploadEntries: UnprocessedUpdateEntry[] = json.items.map((item): UnprocessedUpdateEntry => {
                return {
                    ...createBlankUpdate(),
                    type: UpdateType.YOUTUBE_UPLOAD,
                    id: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    content: item.snippet.description ? item.snippet.description : null,
                    url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                    image_url: item.snippet.thumbnails.standard !== undefined ? item.snippet.thumbnails.standard.url : item.snippet.thumbnails.default.url,
                    author: {
                        id: channel.channel_id,
                        name: channel.username,
                        image_url: channel.author_image_url,
                    },
                    isNew: null,
                }
            });

            entries = [...entries, ...channelUploadEntries]
        }

        return entries;
    }
}