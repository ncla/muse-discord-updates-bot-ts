import { EntryFetcher } from './index';
import { BaseUpdate, SpotifyPlaylistUpdate, UpdateType } from '../updates';
import { SpotifyTokenSchema, SpotifyPlaylistsResponseSchema } from '@/src/zod-schemas/spotify'

export class SpotifyPlaylists implements EntryFetcher {
    private clientId: string;
    private clientSecret: string;
    private users: string[];
    private accessToken: string | null = null;

    constructor(clientId: string|undefined, clientSecret: string|undefined, users: string[]) {
        if (!clientId) {
            throw new Error('Spotify client ID is required');
        }

        if (!clientSecret) {
            throw new Error('Spotify client secret is required');
        }

        if (!users || users.length === 0) {
            throw new Error('At least one Spotify user is required');
        }

        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.users = users;
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken) {
            return this.accessToken;
        }

        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            throw new Error(`Failed to get Spotify access token: ${response.status} ${response.statusText}`);
        }

        const tokenData = SpotifyTokenSchema.parse(await response.json());
        this.accessToken = tokenData.access_token;

        return this.accessToken;
    }

    private async fetchUserPlaylists(userId: string): Promise<SpotifyPlaylistUpdate[]> {
        const token = await this.getAccessToken();
        const updates: SpotifyPlaylistUpdate[] = [];
        let url: string | null = `https://api.spotify.com/v1/users/${userId}/playlists?limit=50`;

        while (url) {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch playlists for user ${userId}: ${response.status} ${response.statusText}`);
            }

            const data = SpotifyPlaylistsResponseSchema.parse(await response.json());

            for (const playlist of data.items) {
                if (!playlist.public) {
                    continue;
                }

                const update: SpotifyPlaylistUpdate = {
                    type: UpdateType.SPOTIFY_PLAYLIST,
                    uniqueId: `${playlist.id}`,
                    id: playlist.id,
                    title: playlist.name,
                    content: playlist.description,
                    url: playlist.external_urls.spotify,
                    image_url: playlist.images && playlist.images.length > 0 ? playlist.images[0].url : null,
                    author: {
                        id: playlist.owner.id,
                        name: userId,
                        image_url: null,
                    },
                    created_at: new Date(),
                    track_count: playlist.tracks.total,
                };

                updates.push(update);
            }

            url = data.next;
        }

        return updates;
    }

    async fetch(): Promise<BaseUpdate[]> {
        const playlistPromises = this.users.map(async (userId) => {
            try {
                return await this.fetchUserPlaylists(userId);
            } catch (error) {
                console.error(`Failed to fetch playlists for user ${userId}:`, error);
                return [];
            }
        });

        const results = await Promise.all(playlistPromises);
        return results.flat();
    }
}