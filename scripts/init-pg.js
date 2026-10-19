import 'dotenv/config';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPSTREAM_COMMIT = '100d585e481fca3413468cbc6a9c70eb5246cc60';
const repository = 'https://github.com/featbit/featbit.git';
const sqlDirectory = 'infra/postgresql/docker-entrypoint-initdb.d';
export const versions = ['0.0.0', '5.0.4', '5.0.5', '5.1.0', '5.2.0', '5.2.1', '5.3.0', '5.3.2', '5.4.0', '5.4.1'];

export function withoutSeedData(sql) {
  const boundaries = [...sql.matchAll(/^-- 2\. seed data\r?$/gm)];
  if (boundaries.length !== 1) throw new Error('Expected exactly one upstream seed-data boundary; initialization stopped');
  return sql.slice(0, boundaries[0].index);
}

async function sourceCheckout(checkout) {
  const directory = resolve(checkout ?? '.cache/featbit-5.4.10');
  if (!checkout) {
    try { await access(directory); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(resolve(directory, '..'), { recursive: true });
      console.log('Cloning FeatBit v5.4.10...');
      execFileSync('git', ['clone', '--depth', '1', '--branch', 'v5.4.10', repository, directory], { stdio: 'inherit' });
    }
  }
  const head = execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== UPSTREAM_COMMIT) throw new Error(`Expected FeatBit 5.4.10 commit ${UPSTREAM_COMMIT}; found ${head}`);
  return directory;
}

// Read committed files, so local working-tree changes cannot alter executed SQL.
export async function prepareScripts(checkout, destination) {
  const directory = await sourceCheckout(checkout);
  const files = [];
  for (const version of versions) {
    const name = `v${version}.sql`;
    let sql = execFileSync('git', ['-C', directory, 'show', `${UPSTREAM_COMMIT}:${sqlDirectory}/${name}`], { encoding: 'utf8' });
    if (version === '0.0.0') sql = withoutSeedData(sql);
    const path = join(destination, name);
    await writeFile(path, sql, { flag: 'wx' });
    files.push(path);
  }
  return files;
}

export async function initializeDatabase({ checkout, connectionString, execute } = {}) {
  if (!execute && !connectionString) throw new Error('POSTGRES_ADMIN_CONNECTION_STRING is required (connect to an administrative database such as postgres)');
  const temporary = await mkdtemp(join(tmpdir(), 'featbit-init-'));
  try {
    // Validate/download every script and the seed boundary before touching PostgreSQL.
    const files = await prepareScripts(checkout, temporary);
    for (const file of files) {
      console.log(`Executing ${file.split('/').at(-1)}...`);
      if (execute) await execute(file);
      else {
        const result = spawnSync('psql', ['-X', '--set', 'ON_ERROR_STOP=1', '--file', file], {
          stdio: 'inherit', env: { ...process.env, PGDATABASE: connectionString }
        });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`psql failed for ${file.split('/').at(-1)} (exit ${result.status}); no subsequent scripts were run`);
      }
    }
    console.log('PostgreSQL initialization complete. Import data only after this step.');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node scripts/init-pg.js [featbit-5.4.10-checkout]');
    await initializeDatabase({ checkout: process.argv[2], connectionString: process.env.POSTGRES_ADMIN_CONNECTION_STRING });
  } catch (error) {
    console.error('PostgreSQL initialization failed:', error.message);
    process.exitCode = 1;
  }
}
