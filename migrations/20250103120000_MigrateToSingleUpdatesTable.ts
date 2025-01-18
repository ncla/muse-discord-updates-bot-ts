import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    const BATCH_SIZE = 100;

    async function insertRecordsInBatches(records: object[]) {
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            await db.insertInto('updates')
                .onConflict((oc) => oc
                    .columns(['type', 'unique_id'])
                    .doNothing()
                )
                .values(batch)
                .execute();
        }
    }

    await db.schema
        .createTable('updates')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('type', 'varchar(32)', col => col.notNull())
        .addColumn('unique_id', 'varchar(256)', col => col.notNull())
        .addColumn('data', 'json')
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('updates_type_unique_id_unique')
        .unique()
        .on('updates')
        .columns(['type', 'unique_id'])
        .execute()

    const bootlegsRecords = await db.selectFrom('bootlegs')
        .selectAll()
        .execute()

    await insertRecordsInBatches(
        bootlegsRecords.map(bootleg => ({
            type: 'musebootlegs',
            unique_id: bootleg.entry_id,
            data: JSON.stringify({
                title: bootleg.entry_text
            }),
            created_at: bootleg.created_at
        }))
    )

    const dimeRecords = await db.selectFrom('dime')
        .selectAll()
        .execute()

    await insertRecordsInBatches(dimeRecords.map(dimeRecord => ({
            type: 'dimeadozen',
            unique_id: dimeRecord.entry_id,
            data: JSON.stringify({
                title: dimeRecord.entry_text
            }),
            created_at: dimeRecord.created_at
        }))
    )

    const facebookPosts = await db.selectFrom('facebook_posts')
        .selectAll()
        .execute()

    await insertRecordsInBatches(facebookPosts.map(facebookPost => ({
            type: 'facebook_post',
            unique_id: facebookPost.entry_id,
            data: JSON.stringify({
                title: facebookPost.entry_text,
                created_at_timestamp: facebookPost.entry_created_at
            }),
            created_at: facebookPost.created_at
        }))
    )

    const instagramFollowings = await db.selectFrom('instagram_following')
        .selectAll()
        .execute()

    await insertRecordsInBatches(instagramFollowings.map(instagramFollow => ({
            type: 'instagram_following',
            unique_id: `${instagramFollow.user_id}_${instagramFollow.entry_id}`,
            data: null,
            created_at: instagramFollow.created_at
        }))
    )

    const instagramPosts = await db.selectFrom('instagram_posts')
        .selectAll()
        .execute()

    await insertRecordsInBatches(instagramPosts.map(instagramPost => ({
            type: 'instagram_post',
            unique_id: instagramPost.entry_id,
            data: JSON.stringify({
                content: instagramPost.entry_text,
                created_at_timestamp: instagramPost.entry_created_at,
                author: {
                    id: null,
                    name: instagramPost.user_name,
                    image_url: null,
                }
            }),
            created_at: instagramPost.created_at
        }))
    )

    const instagramStories = await db.selectFrom('instagram_stories')
        .selectAll()
        .execute()

    await insertRecordsInBatches(instagramStories.map(instagramStory => ({
            type: 'instagram_story',
            unique_id: instagramStory.entry_id,
            data: JSON.stringify({
                content: instagramStory.entry_text,
                created_at_timestamp: instagramStory.entry_created_at,
                author: {
                    id: null,
                    name: instagramStory.user_name,
                    image_url: null,
                }
            }),
            created_at: instagramStory.created_at
        }))
    )

    const musemuGigs = await db.selectFrom('musemu_gigs')
        .selectAll()
        .execute()

    await insertRecordsInBatches(musemuGigs.map(musemuGig => ({
            type: 'musemu_gig',
            unique_id: musemuGig.entry_id,
            data: JSON.stringify({
                title: musemuGig.entry_text,
            }),
            created_at: musemuGig.created_at
        }))
    )

    const musemuNews = await db.selectFrom('musemu_news')
        .selectAll()
        .execute()

    await insertRecordsInBatches(musemuNews.map(musemuNewsItem => ({
            type: 'musemu_news',
            unique_id: musemuNewsItem.entry_id,
            data: JSON.stringify({
                title: musemuNewsItem.entry_text,
            }),
            created_at: musemuNewsItem.created_at
        }))
    )

    const musemuSitemapItems = await db.selectFrom('musemu_sitemap')
        .selectAll()
        .execute()

    await insertRecordsInBatches(musemuSitemapItems.map(musemuSitemapItem => ({
            type: 'musemu_sitemap',
            unique_id: musemuSitemapItem.url,
            data: null,
            created_at: musemuSitemapItem.created_at
        }))
    )

    const redditPosts = await db.selectFrom('reddit_posts')
        .selectAll()
        .execute()

    await insertRecordsInBatches(redditPosts.map(redditPost => ({
            type: 'reddit_post',
            unique_id: `${redditPost.entry_id}`,
            data: JSON.stringify({
                title: redditPost.entry_text,
                created_at_timestamp: redditPost.entry_created_at,
                author: {
                    id: redditPost.user_name,
                    name: redditPost.user_name,
                    image_url: null,
                }
            }),
            created_at: redditPost.created_at
        }))
    )

    const museStoreItems = await db.selectFrom('shop_muse')
        .selectAll()
        .execute()

    await insertRecordsInBatches(museStoreItems.map(museStoreItem => ({
            type: 'muse_shop',
            unique_id: museStoreItem.entry_id,
            data: JSON.stringify({
                title: museStoreItem.entry_text,
            }),
            created_at: museStoreItem.created_at
        }))
    )

    const musemuShopSitemapItems = await db.selectFrom('shop_sitemap_muse')
        .selectAll()
        .execute()

    await insertRecordsInBatches(musemuShopSitemapItems.map(musemuShopSitemapItem => ({
            type: 'musemu_shop_sitemap',
            unique_id: musemuShopSitemapItem.url,
            data: null,
            created_at: musemuShopSitemapItem.created_at
        }))
    )

    const twitterFollowing = await db.selectFrom('twitter_following')
        .selectAll()
        .execute()

    await insertRecordsInBatches(twitterFollowing.map(twitterFollowingItem => ({
            type: 'twitter_following',
            unique_id: `${twitterFollowingItem.user_id}_${twitterFollowingItem.entry_id}`,
            data: JSON.stringify({
                content: twitterFollowingItem.entry_text,
                author: {
                    id: twitterFollowingItem.user_name,
                    name: twitterFollowingItem.user_name,
                    image_url: null,
                }
            }),
            created_at: twitterFollowingItem.created_at
        }))
    )

    const twitterLikes = await db.selectFrom('twitter_likes')
        .selectAll()
        .execute()

    await insertRecordsInBatches(twitterLikes.map(twitterLike => ({
            type: 'twitter_like',
            unique_id: `${twitterLike.user_id}_${twitterLike.entry_id}`,
            data: JSON.stringify({
                content: twitterLike.entry_text,
                created_at_timestamp: twitterLike.entry_created_at,
                author: {
                    id: twitterLike.user_name,
                    name: twitterLike.user_name,
                    image_url: null,
                }
            }),
            created_at: twitterLike.created_at
        }))
    )

    const twitterTweets = await db.selectFrom('twitter_tweets')
        .selectAll()
        .execute()

    await insertRecordsInBatches(twitterTweets.map(twitterTweet => ({
            type: 'twitter_tweet',
            unique_id: `${twitterTweet.user_id}_${twitterTweet.entry_id}`,
            data: JSON.stringify({
                content: twitterTweet.entry_text,
                created_at_timestamp: twitterTweet.entry_created_at,
                author: {
                    id: twitterTweet.user_name,
                    name: twitterTweet.user_name,
                    image_url: null,
                }
            }),
            created_at: twitterTweet.created_at
        }))
    )

    const youtubePlaylistVideos = await db.selectFrom('youtube_playlist_videos')
        .selectAll()
        .execute()

    await insertRecordsInBatches(youtubePlaylistVideos.map(youtubePlaylistVideo => ({
            type: 'youtube_playlist_video',
            unique_id: `${youtubePlaylistVideo.entry_id}_${youtubePlaylistVideo.video_id}`,
            data: JSON.stringify({
                title: youtubePlaylistVideo.entry_text,
                created_at_timestamp: youtubePlaylistVideo.entry_created_at,
            }),
            created_at: youtubePlaylistVideo.created_at
        }))
    )

    const youtubeUploads = await db.selectFrom('youtube_uploads')
        .selectAll()
        .execute()

    await insertRecordsInBatches(youtubeUploads.map(youtubeUpload => ({
            type: 'youtube_upload',
            unique_id: `${youtubeUpload.user_id}_${youtubeUpload.entry_id}`,
            data: JSON.stringify({
                title: youtubeUpload.entry_text,
                created_at_timestamp: youtubeUpload.entry_created_at,
                author: {
                    id: youtubeUpload.user_name,
                    name: youtubeUpload.user_name,
                    image_url: null,
                }
            }),
            created_at: youtubeUpload.created_at
        }))
    )

    await db.schema.dropTable('bootlegs').execute()
    await db.schema.dropTable('dime').execute()
    await db.schema.dropTable('facebook_posts').execute()
    await db.schema.dropTable('instagram_following').execute()
    await db.schema.dropTable('instagram_posts').execute()
    await db.schema.dropTable('instagram_stories').execute()
    await db.schema.dropTable('meta').execute()
    await db.schema.dropTable('musemu_gigs').execute()
    await db.schema.dropTable('musemu_news').execute()
    await db.schema.dropTable('musemu_sitemap').execute()
    await db.schema.dropTable('reddit_posts').execute()
    await db.schema.dropTable('shop_muse').execute()
    await db.schema.dropTable('shop_sitemap_muse').execute()
    await db.schema.dropTable('twitter_following').execute()
    await db.schema.dropTable('twitter_likes').execute()
    await db.schema.dropTable('twitter_tweets').execute()
    await db.schema.dropTable('youtube_playlist_videos').execute()
    await db.schema.dropTable('youtube_uploads').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('updates').execute()

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

    await db.schema
        .createTable('meta')
        .addColumn('name', 'varchar(128)', (col) => col.notNull())
        .addColumn('value', 'varchar(128)',  (col) => col.notNull())
        .execute()

    await db
        .insertInto('meta')
        .values({ name: 'followedAccountsLastCheckedTimestamp', value: '0' })
        .execute()

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

    await db.schema
        .createTable('shop_sitemap_muse')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('url', 'varchar(512)', (col) => col.notNull())
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('shop_sitemap_muse_url_unique')
        .unique()
        .on('shop_sitemap_muse')
        .columns(['url'])
        .execute()

    await db.schema
        .createTable('musemu_sitemap')
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().notNull())
        .addColumn('url', 'varchar(512)', (col) => col.notNull())
        .addColumn('created_at', 'datetime', (col) =>
            col.defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .execute()

    await db.schema
        .createIndex('musemu_sitemap_url_unique')
        .unique()
        .on('musemu_sitemap')
        .columns(['url'])
        .execute()
}
