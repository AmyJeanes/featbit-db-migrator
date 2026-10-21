import { ConverterBase } from "./converterBase.js";

export class ExperimentConverter extends ConverterBase {
  pgColumns = ["id", "env_id", "metric_id", "feature_flag_id", "is_archived", "status", "baseline_variation_id", "iterations", "alpha", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return mongoDocs.map(doc => {
      return this.pgColumns.map(col => {
        const mongoField = this.getMongoFieldFromPgColumn(col);
        let value = doc[mongoField];
        
        if (col === "iterations") {
          // replace _id with id in each iteration
          if (value == null) return this.toStringValue(value);
          value = value.map(iteration => {
            const newIteration = {...iteration};
            if (newIteration._id) {
              newIteration.id = newIteration._id;
              delete newIteration._id;
            }
            return newIteration;
          });

          return this.toStringValue(value);
        }

        return this.toStringValue(value);
      }).join(this.DELIMITER);
    }).join('\n');
  }
}