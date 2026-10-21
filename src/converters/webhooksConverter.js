import { ConverterBase } from "./converterBase.js";

export class WebhooksConverter extends ConverterBase {
    pgColumns = ["id", "org_id", "name", "url", "scopes", "events", "headers", "payload_template_type", "payload_template", "secret", "is_active", "prevent_empty_payloads", "last_delivery", "created_at", "updated_at", "creator_id", "updator_id"];

    toCsv(mongoDocs) {
        return mongoDocs.map(doc => {
            return this.pgColumns.map(col => {
                const mongoField = this.getMongoFieldFromPgColumn(col);
                let value = doc[mongoField];

                // Set default for prevent_empty_payloads
                if (value === undefined && col === 'prevent_empty_payloads') {
                    value = false;
                }

                switch (col) {
                    case 'events':
                    case 'scopes':
                        return this.toStringArrayValue(value);
                    default:
                        return this.toStringValue(value);
                }
            }).join(this.DELIMITER);
        }).join('\n');
    }
}
