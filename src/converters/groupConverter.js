import { ConverterBase } from "./converterBase.js";

export class GroupConverter extends ConverterBase {
  pgColumns = ["id", "organization_id", "name", "description", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return super.toCsv(mongoDocs, this.pgColumns);
  }
}