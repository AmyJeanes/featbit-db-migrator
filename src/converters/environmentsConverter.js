import {ConverterBase} from "./converterBase.js";

export class EnvironmentsConverter extends ConverterBase {
    pgColumns = ["id", "project_id", "name", "key", "description", "secrets", "settings", "created_at", "updated_at"];

    toCsv(mongoDocs) {
      return mongoDocs.map(doc => {
        return this.pgColumns.map(col => {
          const mongoField = this.getMongoFieldFromPgColumn(col);
          let value = doc[mongoField];

          if (col === 'secrets' || col === 'settings') {
            // replace all _id with id in JSON string
            if (value == null) return this.toStringValue(value);
            const normalizedJsonValue = JSON.stringify(value).replace(/"_id":/g, '"id":');
            const normalizedValue = JSON.parse(normalizedJsonValue);

            return this.toStringValue(normalizedValue);
          }

          return this.toStringValue(value);
        }).join(this.DELIMITER);
      }).join('\n');
    }
}