import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('shop_bravadousa').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('shop_bravadousa')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(256)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('shop_bravadousa_entry_id_unique')
        .unique()
        .on('shop_bravadousa')
        .columns(['entry_id'])
        .execute()
}
