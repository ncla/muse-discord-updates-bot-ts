import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('youtube_playlist_videos')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(256)')
        .addColumn('video_id', 'varchar(64)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .addColumn('entry_created_at', 'datetime')
        .execute()

    await db.schema
        .createIndex('youtube_playlist_videos_entry_id_unique')
        .unique()
        .on('youtube_playlist_videos')
        .columns(['entry_id'])
        .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('youtube_playlist_videos').execute()
}
