import {Database} from "../../src/database";
import SQLite from 'better-sqlite3'
import {Kysely, Migrator, SqliteDialect } from 'kysely'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {TypeScriptFileMigrationProvider} from "../../src/ts-migration-transpiler";

export const createTestDatabase = async (dbFileIdentifier: string) => {
    const dialect = new SqliteDialect({
        database: new SQLite(`./data/testing.${dbFileIdentifier}.db.sqlite3`),
    })

    const db = new Kysely<Database>({
        dialect,
    })

    const ROOT_DIR = path.resolve(__dirname, '../..')

    const migrator = new Migrator({
        db,
        provider: new TypeScriptFileMigrationProvider(path.join(__dirname, "..", "..", "migrations")),
    })

    // If you need to output any errors, `migrateToLatest` outputs `error` and `results` property
    // https://kysely.dev/docs/migrations#running-migrations
    await migrator.migrateToLatest()

    return db
}

export const clearTestDatabase = async (dbFileIdentifier: string) => {
    await fs.rm(`./data/testing.${dbFileIdentifier}.db.sqlite3`, {
        force: true,
    })
}
