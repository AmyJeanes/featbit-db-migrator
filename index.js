import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { Client } from 'pg';
import { Migrator } from './migrator.js';

const mongoUri = process.env.MONGODB_CONNECTION_STRING;
const pgUri = process.env.POSTGRES_CONNECTION_STRING;
if (!mongoUri || !pgUri) {
  console.error('MONGODB_CONNECTION_STRING and POSTGRES_CONNECTION_STRING are required');
  process.exitCode = 1;
} else {
  const mongo = new MongoClient(mongoUri);
  const pg = new Client({ connectionString: pgUri });
  try {
    await mongo.connect();
    await pg.connect();
    await new Migrator(mongo, pg, { outputDir: process.argv[2] }).generate_csv();
  } catch (error) {
    console.error('Migration export failed:', error);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([mongo.close(), pg.end()]);
  }
}
