import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('instagram_stories')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('user_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('user_name', 'varchar(64)')
        .addColumn('entry_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(512)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .addColumn('entry_created_at', 'datetime')
        .execute()

    await db.schema
        .createIndex('instagram_stories_user_id_entry_id_unique')
        .unique()
        .on('instagram_stories')
        .columns(['user_id', 'entry_id'])
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('instagram_stories').execute()
}
