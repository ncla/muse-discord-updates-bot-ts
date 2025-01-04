import {
    ColumnType,
    Generated,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely'
import {Update} from "./update";

export interface Database {
    updates: UpdatesTable
}

export interface UpdatesTable {
    id: Generated<number>

    type: ColumnType<string, string, never>

    unique_id: ColumnType<string, string, never>

    data: JSONColumnType<Update | null, Update | undefined, Update | undefined>

    created_at: ColumnType<Date, string | undefined, never>
}

export type SelectableUpdateRecord = Selectable<UpdatesTable>
export type InsertableUpdateRecord = Insertable<UpdatesTable>
export type UpdateableRecordUpdate = Updateable<UpdatesTable>
