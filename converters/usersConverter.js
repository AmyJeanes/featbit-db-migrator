import { ConverterBase } from "./converterBase.js";

export class UsersConverter extends ConverterBase {
    pgColumns = ["id", "name", "email", "password", "origin", "initial_password", "created_at", "updated_at"];
    
    toCsv(mongoDocs) {
        return super.toCsv(mongoDocs.map(doc => ({...doc, origin: doc.origin === undefined ? 'Local' : doc.origin})), this.pgColumns);
    }
}
