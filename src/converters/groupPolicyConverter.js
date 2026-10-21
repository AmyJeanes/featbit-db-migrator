import { ConverterBase } from "./converterBase.js";

export class GroupPolicyConverter extends ConverterBase {
  pgColumns = ["id", "group_id", "policy_id", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return super.toCsv(mongoDocs, this.pgColumns);
  }
}