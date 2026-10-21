import { ConverterBase } from "./converterBase.js";

export class EndUsersConverter extends ConverterBase {
    pgColumns = ["id", "workspace_id", "env_id", "key_id", "name", "customized_properties", "created_at", "updated_at"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}
