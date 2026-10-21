import { ConverterBase } from "./converterBase.js";

export class GroupMemberConverter extends ConverterBase {
  pgColumns = ["id", "group_id", "organization_id", "member_id", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return super.toCsv(mongoDocs, this.pgColumns);
  }
}