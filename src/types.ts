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

    unique_id: string

    data: JSONColumnType<Update>

    created_at: ColumnType<Date, string | undefined, never>
}

export type UpdateRecord = Selectable<UpdatesTable>
export type NewUpdateRecord = Insertable<UpdatesTable>
export type UpdateRecordUpdate = Updateable<UpdatesTable>
