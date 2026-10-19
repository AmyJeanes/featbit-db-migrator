import { ConverterBase } from './converterBase.js';

export class ColumnsConverter extends ConverterBase {
  constructor(columns) {
    super();
    this.pgColumns = columns;
  }
  toCsv(docs) {
    return super.toCsv(docs, this.pgColumns);
  }
}
