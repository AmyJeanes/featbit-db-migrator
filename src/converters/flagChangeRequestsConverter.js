import {ConverterBase} from "./converterBase.js";

export class FlagChangeRequestsConverter extends ConverterBase {
    pgColumns = ["id", "org_id", "env_id", "flag_draft_id", "flag_id", "status", "reason", "reviewers", "schedule_id", "created_at", "updated_at", "creator_id", "updator_id"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}