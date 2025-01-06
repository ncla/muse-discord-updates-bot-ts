import { Kysely } from "kysely";
import {Database, InsertableUpdateRecord, SelectableUpdateRecord} from "../database";

export interface IUpdatesRepository<CreateUpdateRecordType, ReturnableUpdateRecordType> {
    findByTypeAndUniqueId(type: string, uniqueId: string): Promise<ReturnableUpdateRecordType | undefined>;
    create(update: CreateUpdateRecordType): Promise<void> | void;
}

export class UpdatesRepositoryKysely implements IUpdatesRepository<InsertableUpdateRecord, SelectableUpdateRecord>
{
    constructor(private db: Kysely<Database>)
    {
        return this
    }

    findByTypeAndUniqueId(type: string, uniqueId: string): Promise<SelectableUpdateRecord | undefined>
    {
        return this
            .db
            .selectFrom('updates')
            .where('type', '=', type)
            .where('unique_id', '=', uniqueId)
            .selectAll()
            .executeTakeFirst()
    }

    async create(newUpdateRecord: InsertableUpdateRecord): Promise<void>
    {
        if (typeof newUpdateRecord.data === 'object') {
            newUpdateRecord.data = JSON.stringify(newUpdateRecord.data)
        }

        await this
            .db
            .insertInto('updates')
            .values(newUpdateRecord)
            .execute()
    }
}