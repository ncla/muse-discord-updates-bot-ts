import {UpdatesRepositoryKysely} from "../../src/repositories/updates-repository";
import {clearTestDatabase, createTestDatabase} from "../__utils__/database";
import {afterAll, afterEach, beforeEach, expect, test} from 'vitest'
import {UpdateType} from "../../src/update";

beforeEach(async () => {
    await clearTestDatabase()
})

afterEach(async () => {
    await clearTestDatabase()
})

test('it finds an update by type and unique_id', async () => {
    const db = await createTestDatabase()

    const updatesRepository = new UpdatesRepositoryKysely(db)

    await updatesRepository.create({
        type: 'test',
        unique_id: 'test',
    })

    const result = await updatesRepository.findByTypeAndUniqueId('test', 'test')

    expect(result).toBeInstanceOf(Object)
    expect(result).not.toBeNull()
    expect(result!.id).toBe(1)
    expect(result!.type).toBe('test')
    expect(result!.unique_id).toBe('test')
    expect(result!.data).toBeNull()
    expect(result!.created_at).not.toBeNull()
})

test('it returns undefined when no update is found', async () => {
    const db = await createTestDatabase()

    const updatesRepository = new UpdatesRepositoryKysely(db)

    const result = await updatesRepository.findByTypeAndUniqueId('test', 'test')

    expect(result).toBeUndefined()
})

test('it returns object for data property when it has JSON data in column', async () => {
    const db = await createTestDatabase()

    const updatesRepository = new UpdatesRepositoryKysely(db)

    await updatesRepository.create({
        type: 'test',
        unique_id: 'test',
        data: {
            id: 'test_id',
            type: UpdateType.YOUTUBE_UPLOAD,
            uniqueId: 'test_unique_id',
        },
    })

    const result = await updatesRepository.findByTypeAndUniqueId('test', 'test')

    expect(result).not.toBeUndefined()
    // @ts-ignore
    expect(result.data).toBeInstanceOf(Object)
})

test('it creates a new update', async () => {
    const db = await createTestDatabase()

    const updatesRepository = new UpdatesRepositoryKysely(db)

    await updatesRepository.create({
        type: 'test',
        unique_id: 'test',
    })

    const result = await db
        .selectFrom('updates')
        .where('type', '=', 'test')
        .selectAll()
        .execute()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(result[0].type).toBe('test')
    expect(result[0].unique_id).toBe('test')
    expect(result[0].data).toBeNull()
    expect(result[0].created_at).not.toBeNull()
})

test('inserting a duplicate unique_id throws an error', async () => {
    const db = await createTestDatabase()

    const updatesRepository = new UpdatesRepositoryKysely(db)

    await updatesRepository.create({
        type: 'test',
        unique_id: 'test',
    })

    // TODO: Not sure if it's in scope of this project to test SQLite UNIQUE constraint error
    await expect(async () => {
        await updatesRepository.create({
            type: 'test',
            unique_id: 'test',
        })
    }).rejects.toThrowError('UNIQUE constraint failed')
})

test('it creates record with JSON data when passed an object', async () => {
    const db = await createTestDatabase()

    const updatesRepository = new UpdatesRepositoryKysely(db)

    await updatesRepository.create({
        type: 'test',
        unique_id: 'test',
        data: {
            id: 'test_id',
            type: UpdateType.YOUTUBE_UPLOAD,
            uniqueId: 'test_unique_id',
        },
    })

    const result = await db
        .selectFrom('updates')
        .where('type', '=', 'test')
        .selectAll()
        .execute()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(result[0].type).toBe('test')
    expect(result[0].unique_id).toBe('test')
    expect(result[0].data).toMatchInlineSnapshot(`"{"id":"test_id","type":"YOUTUBE_UPLOAD","uniqueId":"test_unique_id"}"`)
    expect(result[0].created_at).not.toBeNull()
})