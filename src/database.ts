import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import config from "./config";
import {
    ColumnType,
    Generated,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely'
import {Update} from "./update";

const dialect = new SqliteDialect({
    database: new SQLite('./data/db.sqlite3'),
})

export function queryLogging(event: any) {
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
    updates: UpdatesTable
}

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
