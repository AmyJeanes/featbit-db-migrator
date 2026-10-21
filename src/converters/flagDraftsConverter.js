import {ConverterBase} from "./converterBase.js";

export class FlagDraftsConverter extends ConverterBase {
    pgColumns = ["id", "env_id", "flag_id", "status", "comment", "data_change", "created_at", "updated_at", "creator_id", "updator_id"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}