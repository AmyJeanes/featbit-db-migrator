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

export function validateSource(collection, doc) {
  if (collection === 'Users' && Object.hasOwn(doc, 'workspaceId')) {
    throw new Error('Legacy Users.workspaceId found; complete the FeatBit 5.4.0 MongoDB upgrade first');
  }
  if (collection === 'OrganizationUsers' && Object.hasOwn(doc, 'initialPassword')) {
    throw new Error('Legacy OrganizationUsers.initialPassword found');
  }
  if (['Policies', 'Segments'].includes(collection) && typeof doc.key !== 'string') {
    throw new Error(`${collection} is missing its 5.4.10 key`);
  }
  if (collection === 'Environments' && (!doc.settings || Array.isArray(doc.settings) || typeof doc.settings !== 'object')) {
    throw new Error('Environments.settings must be a 5.4.10 object');
  }
}
