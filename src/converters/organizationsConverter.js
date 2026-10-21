import { ConverterBase } from "./converterBase.js";

export class OrganizationsConverter extends ConverterBase {
    pgColumns = ["id", "workspace_id", "name", "key", "initialized", "license", "default_permissions", "created_at", "updated_at", "settings"];
    
    toCsv(mongoDocs) {
        return mongoDocs.map(doc => {
            return this.pgColumns.map(col => {
                const mongoField = this.getMongoFieldFromPgColumn(col);
                let value = doc[mongoField];

                if (col === "default_permissions" && value === undefined) {
                    // featbit managed developer policy
                    value = {policyIds:["66f3687f-939d-4257-bd3f-c3553d39e1b6"],groupIds:[]};
                }

                if (col === "settings" && value === undefined) {
                    value = {};
                }

                return this.toStringValue(value);
            }).join(this.DELIMITER);
        }).join('\n');
    }
}
