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

    unique_external_id: string

    created_at: ColumnType<Date, string | undefined, never>

    metadata: JSONColumnType<Update>
}

export type UpdateRecord = Selectable<UpdatesTable>
export type NewUpdateRecord = Insertable<UpdatesTable>
export type UpdateRecordUpdate = Updateable<UpdatesTable>
