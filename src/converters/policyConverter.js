import { ConverterBase } from "./converterBase.js";

export class PolicyConverter extends ConverterBase {
  pgColumns = ["id", "organization_id", "name", "key", "description", "type", "statements", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return mongoDocs.map(doc => {
      return this.pgColumns.map(col => {
        const mongoField = this.getMongoFieldFromPgColumn(col);
        let value = doc[mongoField];
        
        if (col === "statements") {
          // replace _id with id in each statement
          if (value == null) return this.toStringValue(value);
          value = value.map(statement => {
            const newStatement = {...statement};
            if (newStatement._id) {
              newStatement.id = newStatement._id;
              delete newStatement._id;
            }
            return newStatement;
          });
          
          return this.toStringValue(value);
        }

        return this.toStringValue(value);
      }).join(this.DELIMITER);
    }).join('\n');
  }
}