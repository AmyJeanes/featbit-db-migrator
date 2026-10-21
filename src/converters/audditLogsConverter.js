import {ConverterBase} from "./converterBase.js";

export class AuditLogsConverter extends ConverterBase {
    pgColumns = ["id", "env_id", "ref_id", "ref_type", "keyword", "operation", "data_change", "comment", "creator_id", "created_at"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}