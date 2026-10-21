import {ConverterBase} from "./converterBase.js";

export class ProjectsConverter extends ConverterBase {
    pgColumns = ["id", "organization_id", "name", "key", "created_at", "updated_at"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}