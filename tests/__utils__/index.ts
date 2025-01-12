import {createBlankUnprocessedUpdate, UnprocessedUpdateEntry, UpdateType} from "../../src/update";

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

export function createTestUnprocessedEntry(updateType: UpdateType = UpdateType.YOUTUBE_UPLOAD): UnprocessedUpdateEntry
{
    return <UnprocessedUpdateEntry>{
        ...createBlankUnprocessedUpdate(),
        type: updateType,
        uniqueId: 'test',
        id: 'test',
        title: 'title',
        content: 'content',
        url: 'https://youtube.com/watch?v=test',
        image_url: 'https://google.com/image.jpg',
        created_at: new Date(),
        author: {
            id: 'test',
            name: 'muse',
            image_url: 'https://google.com/image.jpg',
        }
    }
}