import { ConverterBase } from "./converterBase.js";

export class WebhookDeliveryConverter extends ConverterBase {
  pgColumns = ["id", "webhook_id", "success", "events", "request", "response", "error", "started_at", "ended_at"];

  toCsv(mongoDocs) {
    return mongoDocs.map(doc => this.pgColumns.map(col => {
      const value = doc[this.getMongoFieldFromPgColumn(col)];
      if (['request', 'response', 'error'].includes(col) && value != null) {
        return this.toStringValue(JSON.stringify(value));
      }
      return this.toStringValue(value);
    }).join(this.DELIMITER)).join('\n');
  }
}