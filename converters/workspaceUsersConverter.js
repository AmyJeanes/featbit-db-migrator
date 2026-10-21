import { ConverterBase } from "./converterBase.js";

export class WorkspaceUsersConverter extends ConverterBase {
    pgColumns = ["id", "workspace_id", "user_id", "created_at", "updated_at"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}
