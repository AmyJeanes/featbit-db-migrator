import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MongoClient } from 'mongodb';
import { Client } from 'pg';
import { initializeDatabase } from '../../scripts/init-postgres.js';

const docker = (...args) => execFileSync('docker', args, {
  encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
}).trim();

export class MigrationContainers {
  constructor() {
    this.pgName = `featbit-migrator-${process.pid}-pg`;
    this.mongoName = `featbit-migrator-${process.pid}-mongo`;
    this.started = [];
  }

  async start() {
    docker('run', '-d', '--name', this.pgName, '-e', 'POSTGRES_PASSWORD=test-only', '-p', '127.0.0.1::5432', 'postgres:15.10');
    this.started.push(this.pgName);
    docker('run', '-d', '--name', this.mongoName, '-p', '127.0.0.1::27017', 'mongo:5.0.32');
    this.started.push(this.mongoName);
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        docker('exec', this.pgName, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres');
        ready = true;
        break;
      } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!ready) throw new Error('PostgreSQL failed to start');
    await initializeDatabase({
      checkout: process.env.FEATBIT_CHECKOUT,
      execute: async file => {
        docker('cp', file, `${this.pgName}:/tmp/init.sql`);
        docker('exec', this.pgName, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-f', '/tmp/init.sql');
      }
    });
    const pgPort = docker('port', this.pgName, '5432').split(':').at(-1);
    const mongoPort = docker('port', this.mongoName, '27017').split(':').at(-1);
    this.pg = new Client({ connectionString: `postgresql://postgres:test-only@127.0.0.1:${pgPort}/featbit` });
    this.mongo = new MongoClient(`mongodb://127.0.0.1:${mongoPort}/featbit`, { serverSelectionTimeoutMS: 15000 });
    await this.pg.connect();
    await this.mongo.connect();
  }

  async copyExport(outputDir) {
    const containerDir = '/tmp/featbit-export';
    docker('exec', this.pgName, 'mkdir', '-p', containerDir);
    docker('cp', outputDir + '/.', `${this.pgName}:${containerDir}`);
    // psql runs in Linux; replace host CSV paths only in the container's script copy.
    const sql = await readFile(join(outputDir, 'scripts-to-run.sql'), 'utf8');
    const script = join(outputDir, 'container-import.sql');
    await writeFile(script, sql.replaceAll(outputDir.replaceAll('\\', '/') + '/', containerDir + '/'));
    docker('cp', script, `${this.pgName}:${containerDir}/scripts-to-run.sql`);
  }

  executeImport() {
    return docker('exec', this.pgName, 'psql', '-X', '-U', 'postgres', '-d', 'featbit', '-f', '/tmp/featbit-export/scripts-to-run.sql');
  }

  async stop() {
    const connections = await Promise.allSettled([this.pg?.end(), this.mongo?.close()]);
    const containers = await Promise.allSettled(
      this.started.map(name => Promise.resolve().then(() => docker('rm', '-f', name)))
    );
    const results = [...connections, ...containers];
    const failures = results.filter(result => result.status === 'rejected').map(result => result.reason);
    if (failures.length) throw new AggregateError(failures, 'Failed to clean up integration containers');
  }
}
