import { Kysely } from "kysely";
import {Database, InsertableUpdateRecord, SelectableUpdateRecord} from "@/src/database";

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

    async findByTypeAndUniqueId(type: string, uniqueId: string): Promise<SelectableUpdateRecord | undefined>
    {
        const result = await this
            .db
            .selectFrom('updates')
            .where('type', '=', type)
            .where('unique_id', '=', uniqueId)
            .selectAll()
            .executeTakeFirst()

        if (result && typeof result.data === 'string') {
            result.data = JSON.parse(result.data)
        }

        return result
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