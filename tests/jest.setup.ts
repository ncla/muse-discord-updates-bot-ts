jest.mock('../src/config', () => {
    const originalConfig = jest.requireActual('../src/config');

    return {
        __esModule: true,
        default: {
            ...originalConfig.default,
            services: {
                youtube: {
                    uploads_api_key: process.env.TEST_YOUTUBE_UPLOADS_API_KEY
                }
            },
        }
    }
})