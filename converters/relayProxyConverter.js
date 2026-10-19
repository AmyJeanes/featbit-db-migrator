import { ConverterBase } from "./converterBase.js";

export class RelayProxyConverter extends ConverterBase {
  pgColumns = ["id", "organization_id", "name", "key", "description", "is_all_envs", "scopes", "agents", "created_at", "updated_at", "auto_agents"];

  toCsv(mongoDocs) {
    return mongoDocs.map(doc => {
      return this.pgColumns.map(col => {
        const mongoField = this.getMongoFieldFromPgColumn(col);
        let value = doc[mongoField];

        if (col === 'agents' || col === 'auto_agents') {
          // replace _id with id in agents and auto_agents arrays
          if (value == null) return this.toStringValue(value);
          value = value.map(original => {
            const agent = {...original};
            if (agent._id) {
              agent.id = agent._id.toString();
              delete agent._id;
            }
            return agent;
          });

          return this.toStringValue(value);
        }
        return this.toStringValue(value);
      }).join(this.DELIMITER);
    }).join('\n');
  }
}