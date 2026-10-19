import {ConverterBase} from "./converterBase.js";

export class SegmentsConverter extends ConverterBase {
    pgColumns = ["id", "workspace_id", "env_id", "name", "key", "type", "scopes", "description", "included", "excluded", "rules", "is_archived", "created_at", "updated_at", "tags"];

    toCsv(mongoDocs) {
        return mongoDocs.map(doc => {
            return this.pgColumns.map(col => {
                const mongoField = this.getMongoFieldFromPgColumn(col);
                let value = doc[mongoField];

                if (col === 'scopes' || col === 'tags' || col === 'included' || col === 'excluded') {
                    return this.toStringArrayValue(value);
                }

                if (col === 'rules') {
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