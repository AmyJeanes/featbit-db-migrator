import {ConverterBase} from "./converterBase.js";

export class TriggersConverter extends ConverterBase {
    pgColumns = ["id", "target_id", "type", "action", "token", "description", "is_enabled", "triggered_times", "last_triggered_at", "created_at", "updated_at"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}