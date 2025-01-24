import {EntryFetcher} from "./index";
import {IConfig} from "../config";
import {IYoutubePlaylistsRepository, YoutubePlaylistsKysely} from "../repositories/youtube-playlists-repository";
import {createBlankUnprocessedUpdate, Update, UpdateType} from "../update";
import {exportHighestResolutionThumbnailUrlFromThumbnailResource} from "../common";

export class YoutubePlaylistVideos<InsertablePlaylistRecord, SelectablePlaylistRecord> implements EntryFetcher
{
    constructor(
        // TODO: Tried to do this as interface but TypeScript could not infer the types from generics
        // TODO: Come back later and try to make this work
        private youtubePlaylistsRepository: YoutubePlaylistsKysely,
        private config: IConfig
    ) {
        return this
    }

    // This fetcher is a bit different because we have to do a side mission to fetch only the playlists that
    // have changed in video count since last check. This is because of rather low rate-limit of the YouTube API.
    async fetch()
    {
        const apiKey = this.config.services.youtube.playlists_api_key

        if (apiKey === undefined) {
            throw new Error('Youtube playlists API key is not set')
        }

        const channels = this.config.fetchables.youtube
            .filter(channel => channel.playlists);

        if (channels.length === 0) {
            console.warn('No channels to fetch playlists from')
            return []
        }

        const { playlistsToUpdate, playlists, playlistIdToOwnerChannelId } = await this.fetchPlaylistsForUpdate(channels, apiKey)

        const playlistItems = await this.fetchPlaylistItemsFromPlaylists(playlistsToUpdate, apiKey)

        return playlistItems.map((playlistItem): Update => {
            const channel = channels.find(
                channel => channel.channel_id === playlistIdToOwnerChannelId[playlistItem.snippet.playlistId]
            )

            if (channel === undefined) {
                throw new Error('Channel not found')
            }

            return this.mapPlayListItemToEntry(
                playlists[playlistItem.snippet.playlistId],
                playlistItem,
                channel
            );
        });
    }

    private async fetchPlaylistsForUpdate(channels: IConfig['fetchables']['youtube'], apiKey: string)
    {
        const playlistsToUpdate: GoogleApiYouTubePlaylistResource[] = []
        const playlists: { [key: string]: GoogleApiYouTubePlaylistResource } = {}
        const playlistIdToOwnerChannelId: { [key: string]: string } = {}

        for (const channel of channels) {
            const channelPlaylistsResponse = await fetch(this.createPlaylistsAPIUrl(channel.channel_id, apiKey));

            if (!channelPlaylistsResponse.ok) {
                throw new Error(`Response status: ${channelPlaylistsResponse.status}`);
            }

            let channelPlaylistsJsonResponse: GoogleApiYouTubePaginationInfo<GoogleApiYouTubePlaylistResource> = await channelPlaylistsResponse.json();

            for (const playlist of channelPlaylistsJsonResponse.items) {
                playlistIdToOwnerChannelId[playlist.id] = channel.channel_id

                const dbExistingPlaylist = await this.youtubePlaylistsRepository.findByPlaylistId(playlist.id);

                playlists[playlist.id] = playlist

                if (dbExistingPlaylist === undefined) {
                    playlistsToUpdate.push(playlist)

                    await this.youtubePlaylistsRepository.create({
                        playlist_id: playlist.id,
                        video_count: playlist.contentDetails.itemCount
                    })
                } else if (dbExistingPlaylist !== null && dbExistingPlaylist.video_count !== playlist.contentDetails.itemCount) {
                    playlistsToUpdate.push(playlist)

                    await this.youtubePlaylistsRepository.updateVideoCount(
                        playlist.id,
                        playlist.contentDetails.itemCount
                    )
                }
            }
        }

        return {
            playlistsToUpdate,
            playlists,
            playlistIdToOwnerChannelId
        }
    }

    private async fetchPlaylistItemsFromPlaylists(playlists: GoogleApiYouTubePlaylistResource[], apiKey: string)
    {
        const playlistItems = [];

        for (const playlist of playlists) {
            const response = await fetch(this.createPlaylistItemsAPIUrl(playlist.id, apiKey));

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            let json: GoogleApiYouTubePaginationInfo<GoogleApiYouTubePlaylistItemResource> = await response.json();

            playlistItems.push(...json.items)
        }

        return playlistItems
    }

    private createPlaylistsAPIUrl(channelId: string, apiKey: string): string
    {
        let url = new URL(`https://www.googleapis.com/youtube/v3/playlists`);

        url.searchParams.append('channelId', channelId)
        url.searchParams.append('maxResults', '50')
        url.searchParams.append('part', 'snippet,contentDetails')
        url.searchParams.append('key', apiKey)
        
        return url.toString()
    }
    
    private createPlaylistItemsAPIUrl(playlistId: string, apiKey: string): string
    {
        let url = new URL(`https://www.googleapis.com/youtube/v3/playlistItems`);

        url.searchParams.append('playlistId', playlistId)
        url.searchParams.append('maxResults', '50')
        url.searchParams.append('part', 'snippet')
        url.searchParams.append('key', apiKey)

        return url.toString()
    }

    private mapPlayListItemToEntry(
        playlist: GoogleApiYouTubePlaylistResource,
        playlistItem: GoogleApiYouTubePlaylistItemResource,
        channel: IConfig['fetchables']['youtube'][number]
    ): Update
    {
        return {
            ...createBlankUnprocessedUpdate(),
            uniqueId: `${playlistItem.snippet.playlistId}_${playlistItem.snippet.resourceId.videoId}`,
            type: UpdateType.YOUTUBE_PLAYLIST_VIDEO,
            id: `${playlistItem.id}`,
            parent_title: playlist.snippet.title,
            title: playlistItem.snippet.title,
            content: playlistItem.snippet.description ? playlistItem.snippet.description : null,
            url: `https://www.youtube.com/watch?v=${playlistItem.snippet.resourceId.videoId}&list=${playlistItem.snippet.playlistId}`,
            image_url: exportHighestResolutionThumbnailUrlFromThumbnailResource(playlistItem.snippet.thumbnails),
            author: {
                id: channel.channel_id,
                name: channel.username,
                image_url: channel.author_image_url,
            },
            created_at: new Date(playlistItem.snippet.publishedAt),
        }
    }
}
