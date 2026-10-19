import { ConverterBase } from "./converterBase.js";

export class AccessTokenConverter extends ConverterBase {
  pgColumns = ["id", "organization_id", "name", "type", "status", "token", "creator_id", "permissions", "last_used_at", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return mongoDocs.map(doc => {
      return this.pgColumns.map(col => {
        const mongoField = this.getMongoFieldFromPgColumn(col);
        let value = doc[mongoField];

        if (col === 'permissions') {
          // for each permission, replace _id with id
          if (value == null) return this.toStringValue(value);
          value = value.map(permission => {
            const newPermission = {...permission};
            if (newPermission._id) {
              newPermission.id = newPermission._id;
              delete newPermission._id;
            }
            return newPermission;
          });

          return this.toStringValue(value);
        }

        return this.toStringValue(value);
      }).join(this.DELIMITER);
    }).join('\n');
  }
}