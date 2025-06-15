import { z } from 'zod';

const SpotifyTokenSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
});

const SpotifyUserSchema = z.object({
    id: z.string(),
    display_name: z.string().nullable(),
    external_urls: z.object({
        spotify: z.string(),
    }),
    href: z.string(),
    type: z.string(),
    uri: z.string(),
});

const SpotifyPlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    collaborative: z.boolean(),
    external_urls: z.object({
        spotify: z.string(),
    }),
    href: z.string(),
    images: z.array(z.object({
        url: z.string(),
        height: z.number().nullable(),
        width: z.number().nullable(),
    })).nullable(),
    owner: SpotifyUserSchema,
    public: z.boolean(),
    snapshot_id: z.string(),
    tracks: z.object({
        href: z.string(),
        total: z.number(),
    }),
    type: z.string(),
    uri: z.string(),
});

const SpotifyPlaylistsResponseSchema = z.object({
    href: z.string(),
    items: z.array(SpotifyPlaylistSchema),
    limit: z.number(),
    next: z.string().nullable(),
    offset: z.number(),
    previous: z.string().nullable(),
    total: z.number(),
});

export {
    SpotifyTokenSchema,
    SpotifyUserSchema,
    SpotifyPlaylistSchema,
    SpotifyPlaylistsResponseSchema,
};