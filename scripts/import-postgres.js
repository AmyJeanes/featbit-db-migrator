import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateScripts } from './generate-postgres-import.js';

export async function importDatabase(directory, connectionString) {
  if (!directory) throw new Error('Export directory is required');
  if (!connectionString) throw new Error('POSTGRES_CONNECTION_STRING is required in .env');
  const sqlPath = await generateScripts(directory);
  const result = spawnSync('psql', ['-X', '--set', 'ON_ERROR_STOP=1', '--file', sqlPath], {
    stdio: 'inherit', env: { ...process.env, PGDATABASE: connectionString }
  });
  if (result.error?.code === 'ENOENT') throw new Error('psql is required; install the PostgreSQL client tools and add them to PATH');
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`PostgreSQL import failed (exit ${result.status}); changes were not committed`);
  console.log('PostgreSQL import complete.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: npm run import-into-postgres');
    await importDatabase(fileURLToPath(new URL('../csvs/', import.meta.url)), process.env.POSTGRES_CONNECTION_STRING);
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exitCode = 1;
  }
}
