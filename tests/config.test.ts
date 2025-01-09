import config from "../src/config";
import dotenv from 'dotenv'
import {beforeAll, expect, test} from 'vitest'

beforeAll(() => {
    dotenv.config()
});

test('config uses test ENV variables', () => {
    expect(config.services.youtube.uploads_api_key).toBe(process.env.TEST_YOUTUBE_UPLOADS_API_KEY);
})
