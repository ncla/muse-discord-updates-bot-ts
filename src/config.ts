import dotenv from 'dotenv'

dotenv.config()

// console.log(process.env)

export interface IConfig {
    app: {
        debug: boolean,
        errorReporting: {
            sentry: {
                dsn: string | undefined,
            }
        }
    }
    services: {
        crtsh: {
            domain: string | undefined,
        },
        musebootlegs: {
            username: string | undefined,
            password: string | undefined,
            user_agent: string | undefined,
        },
        youtube: {
            uploads_api_key: string | undefined,
            playlists_api_key: string | undefined,
        },
        facebook: {
            ad_library_page_id: string | undefined,
        },
        spotify: {
            client_id: string | undefined,
            client_secret: string | undefined,
        }
    }
    fetchables: {
        youtube: {
            username: string,
            channel_id: string,
            uploads_playlist_id: string,
            author_image_url: string,
            uploads: boolean,
            playlists: boolean,
        }[],
        spotify: string[]
    }
    webhooks: {
        discord: {
            id: string | undefined,
            token: string | undefined,
        }
    },
    pingable_mention_ids: {
        discord: {
            musebootlegs_torrents: string | undefined,
            youtube_uploads: string | undefined,
            youtube_playlist_videos: string | undefined,
            domain_certificates: string | undefined,
            gigs: string | undefined,
            store: string | undefined,
            musewiki: string | undefined,
            facebook_ads: string | undefined,
            spotify_playlists: string | undefined,
        }
    }
}

const config: IConfig = {
    app: {
        debug: process.env.APP_DEBUG === 'true',
        errorReporting: {
            sentry: {
                dsn: process.env.SENTRY_DSN,
            }
        }
    },
    services: {
        crtsh: {
            domain: process.env.CRTSH_DOMAIN,
        },
        musebootlegs: {
            username: process.env.MUSEBOOTLEGS_USERNAME,
            password: process.env.MUSEBOOTLEGS_PASSWORD,
            user_agent: process.env.MUSEBOOTLEGS_USER_AGENT,
        },
        youtube: {
            uploads_api_key: process.env.YOUTUBE_UPLOADS_API_KEY,
            playlists_api_key: process.env.YOUTUBE_PLAYLISTS_API_KEY,
        },
        facebook: {
            ad_library_page_id: process.env.FACEBOOK_AD_LIBRARY_PAGE_ID,
        },
        spotify: {
            client_id: process.env.SPOTIFY_CLIENT_ID,
            client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        }
    },
    fetchables: {
        youtube: [
            {
                'username': 'muse',
                'channel_id': 'UCGGhM6XCSJFQ6DTRffnKRIw',
                'uploads_playlist_id': 'UUGGhM6XCSJFQ6DTRffnKRIw',
                'author_image_url': 'https://yt3.ggpht.com/a/AATXAJyCalVyFs_seZmv6CVDdMB5iyI_5L2c1_OBJA=s88-c-k-c0xffffffff-no-rj-mo',
                'uploads': process.env.YOUTUBE_MUSE_UPLOADS === 'true',
                'playlists': process.env.YOUTUBE_MUSE_PLAYLISTS === 'true'
            }
        ],
        spotify: process.env.SPOTIFY_USERS ? process.env.SPOTIFY_USERS.split(',') : []
    },
    webhooks: {
        discord: {
            id: process.env.DISCORD_WEBHOOK_ID,
            token: process.env.DISCORD_WEBHOOK_TOKEN,
        }
    },
    pingable_mention_ids: {
        discord: {
            musebootlegs_torrents: process.env.DISCORD_ROLE_ID_MUSE_BOOTLEGS,
            youtube_uploads: process.env.DISCORD_ROLE_ID_YOUTUBE_UPLOADS,
            youtube_playlist_videos: process.env.DISCORD_ROLE_ID_YOUTUBE_PLAYLISTS,
            domain_certificates: process.env.DISCORD_ROLE_ID_DOMAIN_CERTIFICATES,
            gigs: process.env.DISCORD_ROLE_ID_GIGS,
            store: process.env.DISCORD_ROLE_ID_STORE,
            musewiki: process.env.DISCORD_ROLE_ID_MUSEWIKI,
            facebook_ads: process.env.DISCORD_ROLE_ID_FACEBOOK_ADS,
            spotify_playlists: process.env.DISCORD_ROLE_ID_SPOTIFY_PLAYLISTS,
        }
    }
};

export default config;