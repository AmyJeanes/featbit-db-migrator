export class ConverterBase {
    DELIMITER = '|';

    toCsv(mongoDocs, pgColumns) {
        return mongoDocs.map(doc => {
            return pgColumns.map(col => {
                const mongoField = this.getMongoFieldFromPgColumn(col);
                let value = doc[mongoField];

                return this.toStringValue(value);
            }).join(this.DELIMITER);
        }).join('\n');
    }

    getMongoFieldFromPgColumn(pg_column) {
        if (pg_column === 'id') {
            return '_id';
        }

        // snake_case to camelCase
        return pg_column.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }

    toStringValue(value) {
        // Handle empty string
        if (value === '') {
            return '""';
        }

        // Handle NULL values
        if (value === null || value === undefined) {
            return '';
        }

        // Handle UUID
        if (value?._bsontype === 'UUID' || value?.constructor?.name === 'UUID') {
            return value.toString();
        }

        // Handle Date
        if (value instanceof Date) {
            return value.toISOString();
        }

        // Handle boolean
        if (typeof value === 'boolean') {
            return value ? 't' : 'f';
        }

        // Handle number
        if (typeof value === 'number') {
            return String(value);
        }

        // Handle arrays and objects (JSONB)
        if (typeof value === 'object') {
            const jsonStr = JSON.stringify(value);
            // Escape quotes and wrap in quotes for CSV
            return `"${jsonStr.replace(/"/g, '""')}"`;
        }

        // Handle strings - escape quotes and wrap if contains delimiter, newline, or quote
        const strValue = String(value);
        if (strValue.includes(this.DELIMITER) || strValue.includes('\n') || strValue.includes('\r') || strValue.includes('"')) {
            return `"${strValue.replace(/"/g, '""')}"`;
        }

        return strValue;
    }

    toStringArrayValue(value) {
        if (value === null || value === undefined) return this.toStringValue('{}');
        if (!Array.isArray(value)) throw new Error('Expected a PostgreSQL array');
        const elements = value.map(v => v === null ? 'NULL' :
            '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
        return this.toStringValue('{' + elements.join(',') + '}');
    }
}
