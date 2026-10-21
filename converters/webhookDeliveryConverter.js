import { ConverterBase } from "./converterBase.js";

export class WebhookDeliveryConverter extends ConverterBase {
  pgColumns = ["id", "webhook_id", "success", "events", "request", "response", "error", "started_at", "ended_at"];

  toCsv(mongoDocs) {
    return super.toCsv(mongoDocs, this.pgColumns);
  }
}