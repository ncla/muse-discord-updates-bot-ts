import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('dime')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(512)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('dime_entry_id_unique')
        .unique()
        .on('dime')
        .columns(['entry_id'])
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('dime').execute()
}
