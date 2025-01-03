import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('youtube_playlists')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('playlist_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('video_count', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('youtube_playlists_playlist_id_unique')
        .unique()
        .on('youtube_playlists')
        .columns(['playlist_id'])
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('youtube_playlists').execute()
}
