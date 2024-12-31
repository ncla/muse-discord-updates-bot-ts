import dotenv from 'dotenv'

dotenv.config()

// console.log(process.env)

interface Config {
    services: {
        youtube: {
            uploads_api_key: string | undefined,
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
        }[]
    }
    webhooks: {
        discord: {
            id: string | undefined,
            token: string | undefined,
        }
    }
}

const config: Config = {
    services: {
        youtube: {
            uploads_api_key: process.env.YOUTUBE_UPLOADS_API_KEY
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
        ]
    },
    webhooks: {
        discord: {
            id: process.env.DISCORD_WEBHOOK_ID,
            token: process.env.DISCORD_WEBHOOK_TOKEN,
        }
    }
};

export default config;