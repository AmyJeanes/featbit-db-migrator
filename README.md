# Overview

A Node.js utility for migrating an **already-upgraded FeatBit 5.4.10 MongoDB database into an empty PostgreSQL database**. For FeatBit 5.2.0, use the [v5.2.0 release](https://github.com/featbit/featbit-db-migrator/releases/tag/v5.2.0).

> [!CAUTION]
> Test the migration with an empty PostgreSQL database first, and review the generated SQL scripts before running them in production.

## Scope

**Excluded:**

- `Events`: excluded because the collection may contain a large volume of data. If historical events are required, plan a separate migration with an appropriate scope, such as only the most recent month. Upgrading to FeatBit 6.0 also does not migrate historical Events data; see [Historical data in the v6 upgrade guide](https://docs.featbit.co/installation/upgrade/upgrade-to-v6#historical-data).
- `QueueMessages`: PostgreSQL message-queue storage. MongoDB deployments use Redis for their message queue, so there is no corresponding MongoDB collection to migrate.

**Limitation:** Export stops if `EndUsers` collection exceeds `END_USERS_AUTO_MIGRATION_LIMIT` (default: 10,000 records). Assess data size and migration time before increasing this value in `.env`.

## Prerequisites

- Node.js >= 20.19.0, npm, Git and `psql`.
- A MongoDB database upgraded to FeatBit 5.4.10
- A PostgreSQL server

## Usage

Clone this repository and enter its directory:

```bash
git clone --branch feat/migrate-featbit-5.4.10 --single-branch https://github.com/featbit/featbit-db-migrator.git
cd featbit-db-migrator
```

### 1. Configure and initialize

Install dependencies and copy the configuration template:

```bash
npm ci
cp .env.example .env
```

Edit `.env` with your MongoDB and PostgreSQL connections; see the comments in `.env.example`. The PostgreSQL initialization account needs permission to create databases and the `pg_trgm` extension. Then create the empty `featbit` database and tables:

```bash
npm run init-postgres
```

Run initialization only once, before importing data. Do not start FeatBit against the target until migration is complete.

### 2. Export MongoDB data

Export the MongoDB data to `csvs/` in the project root:
```bash
npm run export-from-mongodb
```

> [!NOTE]
> Each export replaces the previous contents of `csvs/`. Back up any files you want to keep.

The directory contains one CSV per collection and a `manifest.json` file. Continue only after export succeeds.

### 3. Review the import SQL (optional)

Generate the SQL without importing data:

```bash
npm run generate-import-sql
```

Open `csvs/scripts-to-run.sql` in your editor to review it. This is recommended before a production migration. The import command regenerates this file, so do not edit it manually.

### 4. Import into PostgreSQL

Import the files from `csvs/` using the connection configured in `.env`:

```bash
npm run import-into-postgres
```

The command validates the export and imports it into the empty target database. Changes are rolled back if import fails.

After import, configure FeatBit to use PostgreSQL and verify login, permissions and SDK evaluations.

## Project structure

- `scripts/`: command entry points for PostgreSQL initialization, MongoDB export and PostgreSQL import.
- `src/`: migration logic, source normalization, integrity checks, table mappings and per-collection converters.
- `tests/`: unit and Docker integration tests.
