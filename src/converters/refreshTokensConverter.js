import { ConverterBase } from "./converterBase.js";

export class RefreshTokensConverter extends ConverterBase {
    pgColumns = ["id", "token", "user_id", "is_revoked", "replaced_by_token", "created_by_ip", "revoked_by_ip", "expires_at", "revoked_at", "last_used_at", "created_at", "updated_at"];

    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs, this.pgColumns);
    }
}
