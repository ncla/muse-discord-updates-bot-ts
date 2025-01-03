import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('twitter_tweets')
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
        .createIndex('twitter_tweets_user_id_entry_id_unique')
        .unique()
        .on('twitter_tweets')
        .columns(['user_id', 'entry_id'])
        .execute()

    await db.schema
        .createTable('twitter_likes')
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
        .createIndex('twitter_likes_user_id_entry_id_unique')
        .unique()
        .on('twitter_likes')
        .columns(['user_id', 'entry_id'])
        .execute()

    await db.schema
        .createTable('twitter_following')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('user_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('user_name', 'varchar(64)')
        .addColumn('entry_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(512)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('twitter_following_user_id_entry_id_unique')
        .unique()
        .on('twitter_following')
        .columns(['user_id', 'entry_id'])
        .execute()

    await db.schema
        .createTable('instagram_posts')
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
        .createIndex('instagram_posts_user_id_entry_id_unique')
        .unique()
        .on('instagram_posts')
        .columns(['user_id', 'entry_id'])
        .execute()

    await db.schema
        .createTable('instagram_following')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('user_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('user_name', 'varchar(64)')
        .addColumn('entry_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(128)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('instagram_following_user_id_entry_id_unique')
        .unique()
        .on('instagram_following')
        .columns(['user_id', 'entry_id'])
        .execute()

    await db.schema
        .createTable('reddit_posts')
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
        .createIndex('reddit_posts_user_id_entry_id_unique')
        .unique()
        .on('reddit_posts')
        .columns(['user_id', 'entry_id'])
        .execute()

    await db.schema
        .createTable('musemu_gigs')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(256)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .addColumn('entry_created_at', 'datetime')
        .execute()

    await db.schema
        .createIndex('musemu_gigs_entry_id_entry_created_at_unique')
        .unique()
        .on('musemu_gigs')
        .columns(['entry_id', 'entry_created_at'])
        .execute()

    await db.schema
        .createTable('musemu_news')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(256)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .addColumn('entry_created_at', 'datetime')
        .execute()

    await db.schema
        .createIndex('musemu_news_entry_id_entry_created_at_unique')
        .unique()
        .on('musemu_news')
        .columns(['entry_id', 'entry_created_at'])
        .execute()

    await db.schema
        .createTable('shop_muse')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(256)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('shop_muse_entry_id_unique')
        .unique()
        .on('shop_muse')
        .columns(['entry_id'])
        .execute()

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

    await db.schema
        .createTable('facebook_posts')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(512)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .addColumn('entry_created_at', 'datetime')
        .execute()


    await db.schema
        .createIndex('facebook_posts_entry_id_unique')
        .unique()
        .on('facebook_posts')
        .columns(['entry_id'])
        .execute()

    await db.schema
        .createTable('bootlegs')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(512)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('bootlegs_entry_id_unique')
        .unique()
        .on('bootlegs')
        .columns(['entry_id'])
        .execute()

    await db.schema
        .createTable('youtube_uploads')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('user_id', 'varchar(32)', (col) => col.notNull())
        .addColumn('user_name', 'varchar(64)')
        .addColumn('entry_id', 'varchar(128)', (col) => col.notNull())
        .addColumn('entry_text', 'varchar(512)')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .addColumn('entry_created_at', 'datetime')
        .execute()

    await db.schema
        .createIndex('youtube_uploads_user_id_entry_id_unique')
        .unique()
        .on('youtube_uploads')
        .columns(['user_id', 'entry_id'])
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('twitter_tweets').execute()
    await db.schema.dropTable('twitter_likes').execute()
    await db.schema.dropTable('twitter_following').execute()
    await db.schema.dropTable('instagram_posts').execute()
    await db.schema.dropTable('instagram_following').execute()
    await db.schema.dropTable('reddit_posts').execute()
    await db.schema.dropTable('musemu_gigs').execute()
    await db.schema.dropTable('musemu_news').execute()
    await db.schema.dropTable('shop_muse').execute()
    await db.schema.dropTable('shop_bravadousa').execute()
    await db.schema.dropTable('facebook_posts').execute()
    await db.schema.dropTable('bootlegs').execute()
    await db.schema.dropTable('youtube_uploads').execute()
}
