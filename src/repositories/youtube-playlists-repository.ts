import {Kysely} from "kysely";
import {Database, InsertableYoutubePlaylistRecord, ReturnableYoutubePlaylistRecord} from "../database";

export interface IYoutubePlaylistsRepository<CreatePlaylistRecordType, ReturnablePlaylistRecordType> {
    findByPlaylistId(id: string): Promise<ReturnablePlaylistRecordType | undefined>;
    create(playlist: CreatePlaylistRecordType): Promise<void> | void;
    updateVideoCount(playlistId: string, videoCount: number): Promise<void>;
}

export class YoutubePlaylistsKysely implements IYoutubePlaylistsRepository<
    InsertableYoutubePlaylistRecord, ReturnableYoutubePlaylistRecord
>
{
    constructor(private db: Kysely<Database>)
    {
        return this
    }

    async findByPlaylistId(id: string): Promise<ReturnableYoutubePlaylistRecord | undefined>
    {
        return await this
            .db
            .selectFrom('youtube_playlists')
            .where('playlist_id', '=', id)
            .selectAll()
            .executeTakeFirst()
    }

    async create(playlist: InsertableYoutubePlaylistRecord): Promise<void>
    {
        await this
            .db
            .insertInto('youtube_playlists')
            .values(playlist)
            .execute()
    }

    async updateVideoCount(playlistId: string, videoCount: number): Promise<void>
    {
        await this
            .db
            .updateTable('youtube_playlists')
            .set({'video_count': videoCount})
            .where('playlist_id', '=', playlistId)
            .execute()
    }
}