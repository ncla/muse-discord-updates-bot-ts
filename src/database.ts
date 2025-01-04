import { Database } from './types'
import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import config from "./config";

const dialect = new SqliteDialect({
    database: new SQLite('./data/db.sqlite3'),
})

function queryLogging(event: any) {
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