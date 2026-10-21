import { ConverterBase } from "./converterBase.js";

export class ExperimentMetricConverter extends ConverterBase {
  pgColumns = ["id", "env_id", "name", "description", "maintainer_user_id", "event_name", "event_type", "custom_event_track_option", "custom_event_unit", "custom_event_success_criteria", "element_targets", "target_urls", "is_arvhived", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return mongoDocs.map(doc => {
      return this.pgColumns.map(col => {
        const mongoField = this.getMongoFieldFromPgColumn(col);
        let value = doc[mongoField];

        if (col === "target_urls") {
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