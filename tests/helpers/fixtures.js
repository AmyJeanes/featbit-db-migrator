import { createHash } from 'node:crypto';
import { UUID, ObjectId } from 'mongodb';
import { TABLE_MAPPING } from '../../src/collection-table-mapping.js';
import { Converter } from '../../src/converters/converter.js';

export const ids = ['acb588c1-cd8c-4a38-9cc0-71a969a4135a', '9d42b037-eb8c-491c-a529-fb7a7818fc09'];
export const array = ['a,b', 'a"b', '\\', 'NULL', '', null, '中文|\r\nx'];
export const revokedId = '00000000-0000-0000-0000-000000000003';
const tokenHash = value => createHash('sha256').update(value).digest('hex');
export const refreshTokens = [
  {
    _id: new UUID(ids[0]),
    userId: new UUID(ids[0]),
    token: tokenHash('active-test-only'),
    isRevoked: false,
    expiresAt: new Date('2099-01-01T00:00:00Z'),
    revokedAt: null,
    lastUsedAt: null,
    replacedByToken: null,
    createdByIp: '127.0.0.1',
    revokedByIp: null,
  },
  {
    _id: new UUID(ids[1]),
    userId: new UUID(ids[1]),
    token: tokenHash('expired-test-only'),
    isRevoked: false,
    expiresAt: new Date('2000-01-01T00:00:00Z'),
    revokedAt: null,
    lastUsedAt: null,
    replacedByToken: null,
    createdByIp: null,
    revokedByIp: null,
  },
  {
    _id: new UUID(revokedId),
    userId: new UUID(ids[0]),
    token: tokenHash('revoked-test-only'),
    isRevoked: true,
    expiresAt: new Date('2099-01-01T00:00:00Z'),
    revokedAt: new Date('2026-01-02T00:00:00Z'),
    lastUsedAt: new Date('2026-01-02T00:00:00Z'),
    replacedByToken: tokenHash('replacement-test-only'),
    createdByIp: '::1',
    revokedByIp: '127.0.0.2',
  }
].map(doc => ({ ...doc, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-02T00:00:00Z') }));

// Generate broad schema coverage; explicit overrides model business-sensitive fields.
export async function seedSource(mongo, pg) {
  for (const mapping of TABLE_MAPPING) {
    const [collection, table] = Object.entries(mapping)[0];
    const converter = Converter.getConverter(collection);
    const { rows: columns } = await pg.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table]);
    const docs = ids.map((id, i) => {
      const doc = {};
      for (const col of columns) {
        const field = converter.getMongoFieldFromPgColumn(col.column_name);
        switch (col.data_type) {
          case 'uuid': doc[field] = new UUID(id); break;
          case 'timestamp with time zone': case 'date': doc[field] = new Date(`2026-10-${18 + i}T00:00:00Z`); break;
          case 'boolean': doc[field] = i === 0; break;
          case 'integer': case 'bigint': case 'double precision': case 'numeric': doc[field] = i + 1; break;
          case 'ARRAY': doc[field] = array; break;
          case 'jsonb': doc[field] = ['settings', 'sso', 'license', 'default_permissions', 'data_change', 'fallthrough', 'request', 'response', 'last_delivery', 'headers'].includes(col.column_name) ? { preserved: '中文|"\\\r\n', nested: { value: i } } : [{ _id: new UUID(id), value: i }]; break;
          default: doc[field] = col.column_name === 'email' ? `user${i}@example.test` : `value-${i}`;
        }
      }
      if (i === 1) {
        for (const col of columns) {
          if (col.is_nullable === 'YES' && ['jsonb', 'ARRAY'].includes(col.data_type) && col.column_name !== 'settings') {
            doc[converter.getMongoFieldFromPgColumn(col.column_name)] = null;
          }
        }
      }
      if (collection === 'EndUsers') doc.customizedProperties = i ? [] : [{ name: 'company', value: '中文|\"\\\r\n' }];
      if (collection === 'FlagRevisions') doc.flag = { _id: new UUID(id), key: 'flag-key', variations: [{ _id: 'variation-1', value: true }] };
      if (collection === 'Webhooks') doc.headers = i ? null : [{ k: 'X-Api-Key', v: 'value|\"\\\r\n' }];
      if (collection === 'WebhookDeliveries') doc.error = i ? null : { message: 'error|\"\\\r\n' };
      if (collection === 'Users') { doc.password = `password-hash-${i}`; doc.initialPassword = i ? '' : 'initial|"\\\r\n'; }
      if (collection === 'UsageEndUserStats') { doc._id = new ObjectId(); doc.yearMonth = 202610; doc.userKey = `user-${i}`; }
      if (collection === 'UsageEventStats') doc._id = new ObjectId();
      return doc;
    });
    await mongo.db().collection(collection).insertMany(collection === 'RefreshTokens' ? refreshTokens : docs);
  }
  // Composite keys must preserve multiple rows sharing env_id.
  for (const collection of ['UsageEndUserStats', 'UsageEventStats']) {
    await mongo.db().collection(collection).updateMany({}, { $set: { envId: new UUID(ids[0]) } });
  }
}
