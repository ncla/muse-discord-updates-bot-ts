import { vi } from 'vitest';

vi.mock('../src/config', async () => {
    const configImport = await vi.importActual<
        typeof import('../src/config')
    >('../src/config')
    const originalConfig = configImport.default

    return {
        default: {
            ...originalConfig,
            services: {
                youtube: {
                    uploads_api_key: process.env.TEST_YOUTUBE_UPLOADS_API_KEY
                }
            },
            pingable_mention_ids: {
                discord: {
                    youtube_uploads: process.env.TEST_DISCORD_ROLE_ID_YOUTUBE_UPLOADS,
                }
            }
        }
    }
})