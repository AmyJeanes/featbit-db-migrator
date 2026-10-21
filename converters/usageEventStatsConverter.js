import { ConverterBase } from "./converterBase.js";

export class UsageEventStatsConverter extends ConverterBase {
    pgColumns = ["env_id", "stats_date", "flag_evaluations", "custom_metrics"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}
