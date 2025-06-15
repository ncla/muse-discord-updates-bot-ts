import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect, LogEvent } from 'kysely'
import config from "../src/config";
import {
    ColumnType,
    Generated,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely'
import {Update} from "@/src/updates";

const dialect = new SqliteDialect({
    database: new SQLite('./data/db.sqlite3'),
})

export function queryLogging(event: LogEvent) {
    if (event.level === "error") {
        console.error("Query failed: ", {
            durationMs: event.queryDurationMillis,
            error: event.error,
            sql: event.query.sql,
            params: event.query.parameters,
        });
    } else {
        console.log("Query executed: ", {
            durationMs: event.queryDurationMillis,
            sql: event.query.sql,
            params: event.query.parameters,
        });
    }
}

export const db = new Kysely<Database>({
    dialect,
    log: config.app.debug ? queryLogging : undefined
})

export interface Database {
    updates: UpdatesTable,
    youtube_playlists: YoutubePlaylistsTable
}

export interface YoutubePlaylistsTable {
    id: Generated<number>

    playlist_id: ColumnType<string, string, never>

    video_count: ColumnType<number, number, number>

    created_at: ColumnType<Date, string | undefined, never>
}

export type ReturnableYoutubePlaylistRecord = Selectable<YoutubePlaylistsTable>
export type InsertableYoutubePlaylistRecord = Insertable<YoutubePlaylistsTable>
export type UpdateableRecordYoutubePlaylist = Updateable<YoutubePlaylistsTable>

export interface UpdatesTable {
    id: Generated<number>

    type: ColumnType<string, string, never>

    unique_id: ColumnType<string, string, never>

    // TODO: Is there something better than simply specifying string type for JSON serialized data?
    data: JSONColumnType<Update | null, Update | string | undefined, Update | string | undefined>

    created_at: ColumnType<Date, string | undefined, never>
}

export type SelectableUpdateRecord = Selectable<UpdatesTable>
export type InsertableUpdateRecord = Insertable<UpdatesTable>
export type UpdateableRecordUpdate = Updateable<UpdatesTable>
