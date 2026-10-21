import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { Client } from 'pg';
import { MongoDbExporter } from '../src/mongodb-exporter.js';

const mongoUri = process.env.MONGODB_CONNECTION_STRING;
const pgUri = process.env.POSTGRES_CONNECTION_STRING;
if (process.argv.length > 2) {
  console.error('Usage: npm run export-from-mongodb');
  process.exitCode = 1;
} else if (!mongoUri || !pgUri) {
  console.error('MONGODB_CONNECTION_STRING and POSTGRES_CONNECTION_STRING are required');
  process.exitCode = 1;
} else {
  const mongo = new MongoClient(mongoUri);
  const pg = new Client({ connectionString: pgUri });
  try {
    await mongo.connect();
    await pg.connect();
    await new MongoDbExporter(mongo, pg, { endUsersLimit: process.env.END_USERS_AUTO_MIGRATION_LIMIT === undefined ? 10000 : Number(process.env.END_USERS_AUTO_MIGRATION_LIMIT) }).generate_csv();
  } catch (error) {
    console.error('Migration export failed:', error);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([mongo.close(), pg.end()]);
  }
}
