// Requires Docker; uses only isolated test databases, never .env connections.
import assert from 'node:assert/strict';
import { describe, before, after, beforeEach, it } from 'node:test';
import { mkdtemp, readFile, rm, appendFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UUID } from 'mongodb';
import { TABLE_MAPPING } from '../src/collection-table-mapping.js';
import { Converter } from '../src/converters/converter.js';
import { MongoDbExporter } from '../src/mongodb-exporter.js';
import { fileHash } from '../src/file-checksum.js';
import { generateScripts } from '../scripts/generate-postgres-import.js';
import { initializeDatabase } from '../scripts/init-postgres.js';
import { MigrationContainers } from './helpers/containers.js';
import { seedSource, ids, array, revokedId, refreshTokens } from './helpers/fixtures.js';

describe('MongoDB to PostgreSQL migration', { concurrency: false }, () => {
  const containers = new MigrationContainers();
  let pg, mongo, temp, outputDir;

  before(async () => {
    temp = await mkdtemp(join(tmpdir(), 'featbit-migrator-'));
    await containers.start();
    ({ pg, mongo } = containers);
  });

  after(async () => {
    try { await containers.stop(); }
    finally { if (temp) await rm(temp, { recursive: true, force: true }); }
  });

  const exportData = options => new MongoDbExporter(mongo, pg, { outputDir, ...options }).generate_csv();
  const importData = async () => {
    await generateScripts(outputDir);
    await containers.copyExport(outputDir);
    containers.executeImport();
  };

  it('initialization stops after the first failed script', async () => {
    let attempted = 0;
    await assert.rejects(initializeDatabase({
      checkout: process.env.FEATBIT_CHECKOUT,
      execute: async () => { attempted++; throw new Error('Simulated initialization failure'); }
    }), /Simulated initialization failure/);
    assert.equal(attempted, 1, 'Initialization must stop on the first failed script');
  });

  it('initialization leaves seed tables empty and matches converter columns', async () => {
    for (const table of ['workspaces', 'users', 'organizations', 'policies', 'workspace_users']) {
      assert.equal((await pg.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0, 'Initialization must not seed ' + table);
    }
    for (const mapping of TABLE_MAPPING) {
      const [collection, table] = Object.entries(mapping)[0];
      const { rows } = await pg.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table]);
      assert.deepEqual([...Converter.getConverter(collection).pgColumns].sort(), rows.map(c => c.column_name).sort(), table);
    }
  });

  async function resetDatabases() {
    for (const mapping of TABLE_MAPPING) await pg.query(`TRUNCATE ${Object.values(mapping)[0]}`);
    await mongo.db().dropDatabase();
    await seedSource(mongo, pg);
    const scenarioDir = await mkdtemp(join(temp, 'scenario-'));
    outputDir = join(scenarioDir, 'csvs');
  }

  describe('successfully migrated data', { concurrency: false }, () => {
    before(async () => {
      await resetDatabases();
      await exportData();
      await importData();
    });

    it('import preserves table counts and primary keys', async () => {
      for (const m of TABLE_MAPPING) {
        const table = Object.values(m)[0];
        assert.equal((await pg.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, table === 'refresh_tokens' ? 3 : 2, table);
        if (!table.startsWith('usage_')) assert.deepEqual((await pg.query(`SELECT id FROM ${table} ORDER BY id`)).rows.map(r => r.id), (table === 'refresh_tokens' ? [...ids, revokedId] : [...ids]).sort(), table + ' IDs');
      }
    });

    it('EndUsers preserves customized properties', async () => {
      assert.deepEqual((await pg.query('SELECT customized_properties FROM end_users WHERE id=$1', [ids[0]])).rows[0].customized_properties, [{ name: 'company', value: '中文|\"\\\r\n' }]);
    });

    it('refresh tokens preserve active expired and revoked records', async () => {
      for (const doc of refreshTokens) {
        const row = (await pg.query('SELECT * FROM refresh_tokens WHERE id=$1', [doc._id.toString()])).rows[0];
        for (const column of Converter.getConverter('RefreshTokens').pgColumns) {
          const field = Converter.getConverter('RefreshTokens').getMongoFieldFromPgColumn(column);
          const expected = doc[field];
          assert.deepEqual(row[column], expected instanceof UUID ? expected.toString() : expected, `RefreshTokens.${column}`);
        }
      }
    });

    it('business fields survive CSV JSON and array round trips', async () => {
      const users = (await pg.query('SELECT * FROM users ORDER BY email')).rows;
      assert.equal(users[0].password, 'password-hash-0');
      assert.equal(users[0].initial_password, 'initial|"\\\r\n');
      assert.equal(users[1].initial_password, '');
      assert.deepEqual((await pg.query('SELECT headers FROM webhooks WHERE id=$1', [ids[0]])).rows[0].headers, [{ key: 'X-Api-Key', value: 'value|\"\\\r\n' }]);
      assert.deepEqual((await pg.query('SELECT error FROM webhook_deliveries WHERE id=$1', [ids[0]])).rows[0].error, { message: 'error|\"\\\r\n' });
      assert.equal((await pg.query('SELECT count(*)::int n FROM workspace_users w JOIN users u ON u.id=w.user_id JOIN workspaces s ON s.id=w.workspace_id')).rows[0].n, 2);
      assert.deepEqual((await pg.query('SELECT tags FROM segments WHERE id=$1', [ids[0]])).rows[0].tags, array);
      assert.deepEqual((await pg.query('SELECT settings FROM environments WHERE id=$1', [ids[0]])).rows[0].settings, { preserved: '中文|"\\\r\n', nested: { value: 0 } });
      assert.equal((await pg.query('SELECT flag FROM flag_revisions WHERE id=$1', [ids[0]])).rows[0].flag.id, ids[0]);
      assert.equal((await pg.query('SELECT rules FROM feature_flags WHERE id=$1', [ids[0]])).rows[0].rules[0].id, ids[0]);
    });

  });

  describe('export and import scenarios', { concurrency: false }, () => {
    beforeEach(resetDatabases);

    it('export rejects missing required collections', async () => {
      await mongo.db().collection('WorkspaceUsers').drop();
      await assert.rejects(new MongoDbExporter(mongo, pg, { outputDir: join(temp, 'empty-source') }).generate_csv(), /Missing source collection/);
    });

    it('export enforces the EndUsers limit and writes batches at the limit', async () => {
      const limitedDir = join(outputDir, '..', 'over-limit');
      await assert.rejects(new MongoDbExporter(mongo, pg, { outputDir: limitedDir, endUsersLimit: 1 }).generate_csv(), /exceeding END_USERS_AUTO_MIGRATION_LIMIT/);
      await assert.rejects(readFile(join(limitedDir, '.started')), /ENOENT/);
      await new MongoDbExporter(mongo, pg, { outputDir, batchSize: 1, endUsersLimit: 2 }).generate_csv();
      await generateScripts(outputDir);
    });

    it('SQL generation rejects modified CSV files', async () => {
      await exportData();
      const original = await readFile(join(outputDir, '0_workspaces.csv'));
      await appendFile(join(outputDir, '0_workspaces.csv'), 'tampered');
      await assert.rejects(generateScripts(outputDir), /checksum/);
      await writeFile(join(outputDir, '0_workspaces.csv'), original);
      await generateScripts(outputDir);
    });

    it('import rolls back orphan memberships and succeeds after correction', async () => {
      await exportData();
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
      await containers.copyExport(outputDir);
      assert.throws(() => containers.executeImport(), /Orphan workspace membership/);
      assert.equal((await pg.query('SELECT count(*)::int n FROM users')).rows[0].n, 0, 'Import must roll back');
      await writeFile(membershipPath, membershipCsv);
      await writeFile(manifestPath, originalManifest);
      await generateScripts(outputDir);
      await containers.copyExport(outputDir);
      containers.executeImport();
    });

    it('export and import reject populated targets and missing exports', async () => {
      await exportData();
      await importData();
      await assert.rejects(new MongoDbExporter(mongo, pg, { outputDir: join(temp, 'retry') }).generate_csv(), /not empty/);
      assert.throws(() => containers.executeImport(), /Command failed/);
      await assert.rejects(generateScripts(join(temp, 'missing')), /ENOENT/);
    });

    it('repeated export replaces stale files', async () => {
      await exportData();
      await writeFile(join(outputDir, 'stale.csv'), 'old export');
      await new MongoDbExporter(mongo, pg, { outputDir }).generate_csv();
      await assert.rejects(readFile(join(outputDir, 'stale.csv')), /ENOENT/);
      assert.equal(JSON.parse(await readFile(join(outputDir, 'manifest.json'), 'utf8')).tables.length, 31);
    });

    it('failed conversion leaves no usable manifest', async () => {
      await mongo.db().collection('Segments').updateOne({}, { $set: { tags: 'invalid-array' } });
      const failedDir = outputDir;
      await assert.rejects(new MongoDbExporter(mongo, pg, { outputDir: failedDir }).generate_csv(), /Expected a PostgreSQL array/);
      await assert.rejects(readFile(join(failedDir, 'manifest.json')), /ENOENT/);
    });

  });
});
