import { ConverterBase } from "./converterBase.js";

export class WorkspacesConverter extends ConverterBase {
    pgColumns = ["id", "name", "key", "license", "sso", "created_at", "updated_at"];
    
    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}
