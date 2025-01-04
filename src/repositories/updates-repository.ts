import { Kysely } from "kysely";
import {Database, InsertableUpdateRecord, SelectableUpdateRecord} from "../types";

interface IUpdatesRepository<UpdateCreateType, ReturnableRecordType> {
    findByTypeAndUniqueId(type: string, uniqueId: string): Promise<ReturnableRecordType | undefined>;
    create(update: UpdateCreateType): Promise<void> | void;
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
        await this
            .db
            .insertInto('updates')
            .values(newUpdateRecord)
            .execute()
    }
}