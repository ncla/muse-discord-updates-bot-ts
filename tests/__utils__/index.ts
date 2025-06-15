import {createBlankUpdate, UpdateType, YoutubeUploadUpdate} from "@/src/updates";
import {IConfig} from "@/src/config";

export function repeatText(text: string, times: number) {
    if (times < 0) {
        return ''
    }

    let result = ''

    for (let i = 0; i < times; i++) {
        result += text
    }

    return result;
}

export function createTestYoutubeUploadsEntry(): YoutubeUploadUpdate
{
    return {
        ...createBlankUpdate(),
        type: UpdateType.YOUTUBE_UPLOAD,
        uniqueId: 'test',
        id: 'test',
        title: 'title',
        content: 'content',
        url: 'https://youtube.com/watch?v=test',
        image_url: 'https://google.com/image.jpg',
        author: {
            id: 'test',
            name: 'muse',
            image_url: 'https://google.com/image.jpg',
        },
        created_at: new Date()
    }
}

export async function getTestConfig()
{
    const config = await import('../../src/config')
    return JSON.parse(JSON.stringify(config.default)) as IConfig
}

export function groupTimestampsByInterval(sortedArrayWithTimestamps: number[], secondAmount: number, startTime: number)
{
    return sortedArrayWithTimestamps.reduce((groups, result) => {
        const currentTime = Number(result);
        const intervalIndex = Math.floor((currentTime - startTime) / (secondAmount * 1000));

        // Fill any gaps up to current index
        for (let i = 0; i <= intervalIndex; i++) {
            if (!groups[i]) groups[i] = [];
        }

        if (!groups[intervalIndex]) {
            groups[intervalIndex] = [];
        }

        groups[intervalIndex].push(currentTime);

        return groups;
    }, [] as number[][]);
}