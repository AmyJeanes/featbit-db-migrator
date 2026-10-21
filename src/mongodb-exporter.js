import { createHash } from 'node:crypto';
import { mkdir, writeFile, appendFile, rm } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { TABLE_MAPPING } from './collection-table-mapping.js';
import { Converter } from './converters/converter.js';
import { normalizeBson } from './mongodb-document.js';

export class MongoDbExporter {
  constructor(mongodb, postgres, { outputDir, batchSize = 500, endUsersLimit = 10000 } = {}) {
    this.mongodb = mongodb.db();
    this.postgres = postgres;
    this.outputDir = resolve(outputDir ?? fileURLToPath(new URL('../csvs/', import.meta.url)));
    this.batchSize = batchSize;
    if (!Number.isSafeInteger(endUsersLimit) || endUsersLimit < 0) {
      throw new Error('END_USERS_AUTO_MIGRATION_LIMIT must be a nonnegative safe integer');
    }
    this.endUsersLimit = endUsersLimit;
  }

  async generate_csv() {
    const collections = new Set((await this.mongodb.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
    for (const required of ['Workspaces', 'Users', 'WorkspaceUsers']) {
      if (!collections.has(required)) throw new Error(`Missing source collection ${required}; verify database selection and completed upgrades`);
    }
    const endUsersCount = await this.mongodb.collection('EndUsers').countDocuments();
    if (endUsersCount > this.endUsersLimit) {
      throw new Error(`EndUsers has ${endUsersCount} records, exceeding END_USERS_AUTO_MIGRATION_LIMIT=${this.endUsersLimit}; assess migration size and time before increasing the limit`);
    }
    await this.postgres.query('SET search_path TO public');
    // Reject populated targets, including tables intentionally excluded from migration.
    const tables = await this.postgres.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    for (const { tablename } of tables.rows) {
      const quoted = '"' + tablename.replaceAll('"', '""') + '"';
      const result = await this.postgres.query(`SELECT 1 FROM ${quoted} LIMIT 1`);
      if (result.rowCount) throw new Error(`Target table ${tablename} is not empty; use a fresh initialized database`);
    }
    for (const mapping of TABLE_MAPPING) {
      const [collection, table] = Object.entries(mapping)[0];
      const converter = Converter.getConverter(collection);
      await this.postgres.query(`SELECT ${converter.pgColumns.join(',')} FROM ${table} LIMIT 0`);
    }
    // Only replace an export directory inside this project or the test temporary directory.
    const roots = [fileURLToPath(new URL('../', import.meta.url)), tmpdir()];
    if (!roots.some(root => {
      const path = relative(resolve(root), this.outputDir);
      return path && path !== '..' && !path.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && !isAbsolute(path);
    })) throw new Error('Export directory must be inside the project or temporary directory');
    await rm(this.outputDir, { recursive: true, force: true });
    await mkdir(dirname(this.outputDir), { recursive: true });
    await mkdir(this.outputDir);
    // Mark interrupted runs; only completed exports receive a manifest.
    await writeFile(join(this.outputDir, '.started'), '', { flag: 'wx' });
    const manifest = { version: '5.4.10', createdAt: new Date().toISOString(), tables: [] };
    for (const [index, mapping] of TABLE_MAPPING.entries()) {
      const [collection, table] = Object.entries(mapping)[0];
      const converter = Converter.getConverter(collection);
      const file = `${index}_${table}.csv`;
      const path = join(this.outputDir, file);
      await writeFile(path, '', { flag: 'wx' });
      const hash = createHash('sha256');
      let rows = 0;
      let batch = [];
      const flush = async () => {
        if (!batch.length) return;
        const content = converter.toCsv(batch) + '\n';
        await appendFile(path, content);
        hash.update(content);
        rows += batch.length;
        batch = [];
      };
      const cursor = this.mongodb.collection(collection).find().batchSize(this.batchSize);
      try {
        for await (const raw of cursor) {
          const doc = normalizeBson(raw);
          batch.push(doc);
          if (batch.length >= this.batchSize) await flush();
        }
        await flush();
      } finally {
        await cursor.close();
      }
      manifest.tables.push({ collection, table, columns: converter.pgColumns, file, rows, sha256: hash.digest('hex') });
      console.log(`${collection}: exported ${rows} rows`);
    }
    // Only a complete export gets a manifest; script generation requires it.
    await writeFile(join(this.outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
    await rm(join(this.outputDir, '.started'));
    console.log(`Export complete: ${this.outputDir}`);
    return this.outputDir;
  }
}
