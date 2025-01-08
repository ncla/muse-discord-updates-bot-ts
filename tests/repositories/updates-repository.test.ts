import {UpdatesRepositoryKysely} from "../../src/repositories/updates-repository";
import {clearTestDatabase, createTestDatabase} from "../__utils__/database";

test('it creates a new update', async () => {
    await clearTestDatabase()

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