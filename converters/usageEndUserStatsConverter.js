import { ConverterBase } from "./converterBase.js";

export class UsageEndUserStatsConverter extends ConverterBase {
    pgColumns = ["env_id", "year_month", "user_key", "first_seen_at"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}
