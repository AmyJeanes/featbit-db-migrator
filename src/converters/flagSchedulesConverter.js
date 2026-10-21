import {ConverterBase} from "./converterBase.js";

export class FlagSchedulesConverter extends ConverterBase {
    pgColumns = ["id", "org_id", "env_id", "flag_draft_id", "flag_id", "status", "title", "scheduled_time", "change_request_id", "created_at", "updated_at", "creator_id", "updator_id"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}