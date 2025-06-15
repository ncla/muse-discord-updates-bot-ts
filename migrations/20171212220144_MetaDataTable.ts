import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('meta')
        .addColumn('name', 'varchar(128)', (col) => col.notNull())
        .addColumn('value', 'varchar(128)',  (col) => col.notNull())
        .execute()

    await db
        .insertInto('meta')
        .values({ name: 'followedAccountsLastCheckedTimestamp', value: '0' })
        .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('meta').execute()
}
