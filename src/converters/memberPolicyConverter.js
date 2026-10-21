import { ConverterBase } from "./converterBase.js";

export class MemberPolicyConverter extends ConverterBase {
  pgColumns = ["id", "organization_id", "member_id", "policy_id", "created_at", "updated_at"];

  toCsv(mongoDocs) {
    return super.toCsv(mongoDocs, this.pgColumns);
  }
}