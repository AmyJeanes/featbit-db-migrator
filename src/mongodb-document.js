// Convert BSON values before any JSON serialization (including nested UUIDs).
export function normalizeBson(value) {
  if (value === null || value === undefined || value instanceof Date) return value;
  if (value?._bsontype === 'UUID') return value.toString();
  if (value?._bsontype === 'Binary' && value.sub_type === 4) return value.toUUID().toString();
  if (value?._bsontype === 'Long') return value.toString();
  if (value?._bsontype === 'ObjectId') return value.toHexString();
  if (Array.isArray(value)) return value.map(normalizeBson);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeBson(v)]));
  }
  return value;
}
