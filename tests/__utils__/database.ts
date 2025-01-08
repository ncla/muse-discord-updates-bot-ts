import {Database} from "../../src/database";
import SQLite from 'better-sqlite3'
import {FileMigrationProvider, Kysely, Migrator, SqliteDialect } from 'kysely'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const createTestDatabase = async () => {
    const dialect = new SqliteDialect({
        database: new SQLite('./data/testing.db.sqlite3'),
    })

    const db = new Kysely<Database>({
        dialect,
    })

    const ROOT_DIR = path.resolve(__dirname, '../..')

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder: path.join(ROOT_DIR, 'migrations'),
        }),
    })

    await migrator.migrateToLatest()

    return db
}

export const clearTestDatabase = async () => {
    await fs.rm('./data/testing.db.sqlite3')
}
