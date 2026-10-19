// Isolated integration test: requires Docker, never uses configured customer databases.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, appendFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MongoClient, UUID, ObjectId } from 'mongodb';
import { Client } from 'pg';
import { TABLE_MAPPING } from '../tables.js';
import { Converter } from '../converters/converter.js';
import { Migrator } from '../migrator.js';
import { fileHash } from '../integrity.js';
import { generateScripts } from '../get-scripts.js';
import { initializeDatabase } from '../scripts/init-pg.js';

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const prefix = `featbit-migrator-${process.pid}`;
const pgName = `${prefix}-pg`, mongoName = `${prefix}-mongo`;
const temp = await mkdtemp(join(tmpdir(), 'featbit-migrator-'));
let pg, mongo;
const ids = ['acb588c1-cd8c-4a38-9cc0-71a969a4135a', '9d42b037-eb8c-491c-a529-fb7a7818fc09'];
const array = ['a,b', 'a"b', '\\', 'NULL', '', null, '中文|\r\nx'];
try {
  docker('run', '-d', '--name', pgName, '-e', 'POSTGRES_PASSWORD=test-only', '-p', '127.0.0.1::5432', 'postgres:15.10');
  docker('run', '-d', '--name', mongoName, '-p', '127.0.0.1::27017', 'mongo:5.0.32');
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { docker('exec', pgName, 'pg_isready', '-U', 'postgres'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 250)); }
  }
  assert(ready, 'PostgreSQL failed to start');
  let attempted = 0;
  await assert.rejects(initializeDatabase({
    checkout: process.env.FEATBIT_CHECKOUT,
    execute: async () => { attempted++; throw new Error('Simulated initialization failure'); }
  }), /Simulated initialization failure/);
  assert.equal(attempted, 1, 'Initialization must stop on the first failed script');
  await initializeDatabase({
    checkout: process.env.FEATBIT_CHECKOUT,
    execute: async file => {
      docker('cp', file, `${pgName}:/tmp/init.sql`);
      docker('exec', pgName, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-f', '/tmp/init.sql');
    }
  });
  const pgPort = docker('port', pgName, '5432').split(':').at(-1);
  const mongoPort = docker('port', mongoName, '27017').split(':').at(-1);
  pg = new Client({ connectionString: `postgresql://postgres:test-only@127.0.0.1:${pgPort}/featbit` });
  mongo = new MongoClient(`mongodb://127.0.0.1:${mongoPort}/featbit`, { serverSelectionTimeoutMS: 15000 });
  await pg.connect(); await mongo.connect();
  for (const table of ['workspaces', 'users', 'organizations', 'policies', 'workspace_users']) {
    assert.equal((await pg.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0, 'Initialization must not seed ' + table);
  }
  await assert.rejects(new Migrator(mongo, pg, { outputDir: join(temp, 'empty-source') }).generate_csv(), /Missing source collection/);
  for (const mapping of TABLE_MAPPING) {
    const [collection, table] = Object.entries(mapping)[0];
    const converter = Converter.getConverter(collection);
    const { rows: columns } = await pg.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table]);
    assert.deepEqual([...converter.pgColumns].sort(), columns.map(c => c.column_name).sort(), `Schema mismatch: ${table}`);
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
      if (collection === 'FlagRevisions') doc.flag = { _id: new UUID(id), key: 'flag-key', variations: [{ _id: 'variation-1', value: true }] };
      if (collection === 'WebhookDeliveries') doc.error = i ? null : 'error|\"\\\r\n';
      if (collection === 'Users') { doc.password = `password-hash-${i}`; doc.initialPassword = i ? '' : 'initial|"\\\r\n'; }
      if (collection === 'UsageEndUserStats') { doc._id = new ObjectId(); doc.yearMonth = 202610; doc.userKey = `user-${i}`; }
      if (collection === 'UsageEventStats') doc._id = new ObjectId();
      return doc;
    });
    await mongo.db().collection(collection).insertMany(docs);
  }
  // Composite keys must preserve multiple rows sharing env_id.
  for (const collection of ['UsageEndUserStats', 'UsageEventStats']) {
    await mongo.db().collection(collection).updateMany({}, { $set: { envId: new UUID(ids[0]) } });
  }
  const outputDir = join(temp, 'export');
  await new Migrator(mongo, pg, { outputDir, batchSize: 1 }).generate_csv();
  const sqlPath = await generateScripts(outputDir);
  const original = await readFile(join(outputDir, '0_workspaces.csv'));
  await appendFile(join(outputDir, '0_workspaces.csv'), 'tampered');
  await assert.rejects(generateScripts(outputDir), /checksum/);
  await writeFile(join(outputDir, '0_workspaces.csv'), original);
  await generateScripts(outputDir);
  // Verify that a relationship error rolls back all previously copied tables.
  const membershipPath = join(outputDir, '2_workspace_users.csv');
  const membershipCsv = await readFile(membershipPath, 'utf8');
  const manifestPath = join(outputDir, 'manifest.json');
  const originalManifest = await readFile(manifestPath, 'utf8');
  const broken = JSON.parse(originalManifest);
  const membershipRows = membershipCsv.split('\n');
  const fields = membershipRows[0].split('|');
  fields[2] = '00000000-0000-0000-0000-000000000001';
  membershipRows[0] = fields.join('|');
  await writeFile(membershipPath, membershipRows.join('\n'));
  broken.tables[2].sha256 = await fileHash(membershipPath);
  await writeFile(manifestPath, JSON.stringify(broken));
  await generateScripts(outputDir);
  docker('exec', pgName, 'mkdir', '-p', outputDir);
  docker('cp', outputDir + '/.', `${pgName}:${outputDir}`);
  assert.throws(() => docker('exec', pgName, 'psql', '-U', 'postgres', '-d', 'featbit', '-f', sqlPath), /Orphan workspace membership/);
  assert.equal((await pg.query('SELECT count(*)::int n FROM users')).rows[0].n, 0, 'Import must roll back');
  await writeFile(membershipPath, membershipCsv);
  await writeFile(manifestPath, originalManifest);
  await generateScripts(outputDir);
  docker('cp', outputDir + '/.', `${pgName}:${outputDir}`);
  docker('exec', pgName, 'psql', '-U', 'postgres', '-d', 'featbit', '-f', sqlPath);
  for (const m of TABLE_MAPPING) {
    const table = Object.values(m)[0];
    assert.equal((await pg.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, 2, table);
    if (!table.startsWith('usage_')) assert.deepEqual((await pg.query(`SELECT id FROM ${table} ORDER BY id`)).rows.map(r => r.id), [...ids].sort(), table + ' IDs');
  }
  const users = (await pg.query('SELECT * FROM users ORDER BY email')).rows;
  assert.equal(users[0].password, 'password-hash-0');
  assert.equal(users[0].initial_password, 'initial|"\\\r\n');
  assert.equal(users[1].initial_password, '');
  assert.equal((await pg.query('SELECT error FROM webhook_deliveries WHERE id=$1', [ids[0]])).rows[0].error, 'error|\"\\\r\n');
  assert.equal((await pg.query('SELECT count(*)::int n FROM workspace_users w JOIN users u ON u.id=w.user_id JOIN workspaces s ON s.id=w.workspace_id')).rows[0].n, 2);
  assert.deepEqual((await pg.query('SELECT tags FROM segments WHERE id=$1', [ids[0]])).rows[0].tags, array);
  assert.deepEqual((await pg.query('SELECT settings FROM environments WHERE id=$1', [ids[0]])).rows[0].settings, { preserved: '中文|"\\\r\n', nested: { value: 0 } });
  assert.equal((await pg.query('SELECT flag FROM flag_revisions WHERE id=$1', [ids[0]])).rows[0].flag.id, ids[0]);
  assert.equal((await pg.query('SELECT rules FROM feature_flags WHERE id=$1', [ids[0]])).rows[0].rules[0].id, ids[0]);
  await assert.rejects(new Migrator(mongo, pg, { outputDir: join(temp, 'retry') }).generate_csv(), /not empty/);
  assert.throws(() => docker('exec', pgName, 'psql', '-U', 'postgres', '-d', 'featbit', '-f', sqlPath), /Command failed/);
  await assert.rejects(generateScripts(join(temp, 'missing')), /ENOENT/);
  // A failed source validation must leave no usable manifest.
  for (const m of TABLE_MAPPING) await pg.query(`TRUNCATE ${Object.values(m)[0]}`);
  await assert.rejects(new Migrator(mongo, pg, { outputDir }).generate_csv(), /EEXIST/);
  await mongo.db().collection('Users').updateOne({}, { $set: { workspaceId: new UUID(ids[0]) } });
  const failedDir = join(temp, 'failed');
  await assert.rejects(new Migrator(mongo, pg, { outputDir: failedDir }).generate_csv(), /Legacy/);
  await assert.rejects(readFile(join(failedDir, 'manifest.json')), /ENOENT/);
  console.log('Integration passed: 29 table mappings, 58 rows, BSON/JSON/array round trips, memberships, composite keys and failure guards.');
} finally {
  await Promise.allSettled([pg?.end(), mongo?.close()]);
  for (const name of [pgName, mongoName]) { try { docker('rm', '-f', name); } catch {} }
  await rm(temp, { recursive: true, force: true });
}
