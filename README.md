# FeatBit 5.4.10 MongoDB → PostgreSQL Migrator

A Node.js utility for migrating an **already-upgraded FeatBit 5.4.10 MongoDB database into an empty PostgreSQL database**. For FeatBit 5.2.0, use the [v5.2.0 release](https://github.com/featbit/featbit-db-migrator/releases/tag/v5.2.0).

The export preserves IDs, password hashes, workspace memberships, policy/segment keys, environment settings and usage summaries. It does not upgrade old FeatBit data or synchronize an existing PostgreSQL deployment. Populated targets are rejected.

## Scope

29 collections are migrated. See the [complete field mapping and version differences](docs/mapping-5.4.10.md).

Excluded:

- `EndUsers`: end-user records. `EndUserProperties` metadata is included.
- `Events`: raw events and analytics history; assess analytics storage separately.
- `RefreshTokens`: users must log in again after cutover. Existing JWT validity also depends on signing keys and expiry.
- `QueueMessages`: transient work; drain pending processing before the final snapshot.

If these exclusions do not meet the customer's requirements, resolve their separate migration plan before cutover.

## Prerequisites

- Node.js >= 20.19.0 and `npm`.
- Git, `psql`, PostgreSQL 15 (integration-tested), and permission to create the database and `pg_trgm` extension.
- A consistent MongoDB backup/snapshot whose FeatBit upgrades through 5.4.10 have completed, including the 5.4.0 user/workspace migration.
- A fresh PostgreSQL instance/database with no default FeatBit account or seeded business data.

## 1. Initialize PostgreSQL

Install dependencies and configure the connection strings first:

```bash
npm ci
cp .env.example .env
# Set POSTGRES_ADMIN_CONNECTION_STRING to the target server's postgres database.
npm run init:pg
```

The command clones FeatBit v5.4.10 into `.cache/featbit-5.4.10` on first use and verifies the reviewed commit `100d585e481fca3413468cbc6a9c70eb5246cc60`. Git and `psql` must be installed. You can reuse an existing checkout:

```bash
npm run init:pg -- /path/to/featbit-v5.4.10
```

All SQL is read from the pinned Git commit, so local changes in that checkout are not executed. The command checks that every required file exists and that the base script has exactly one `-- 2. seed data` boundary before touching PostgreSQL.

It then runs the base script **without seed data**, followed by the original upgrade scripts in this order: `5.0.4`, `5.0.5`, `5.1.0`, `5.2.0`, `5.2.1`, `5.3.0`, `5.3.2`, `5.4.0`, `5.4.1`. Each file runs separately through `psql -X` with `ON_ERROR_STOP=1`; logs identify the current script. Temporary SQL files are removed afterward.

The base script creates and connects to database `featbit`. Run initialization **only before import**, once, on a fresh target. Any failure stops subsequent scripts; earlier changes may already be committed. Resolve the error and recreate the dedicated empty target before retrying. There is no automatic resume or destructive database cleanup. Do not replay historical upgrades after import: some reset settings or change permissions.

Do not start FeatBit against the target until after migration; application startup may seed records.

## 2. Configure and export

Using the `.env` configured above, set `MONGODB_CONNECTION_STRING` to the intended source database and `POSTGRES_CONNECTION_STRING` to the target `featbit` database:

```bash
node index.js
```

The command prints its output directory under `exports/`. To select a directory explicitly:

```bash
node index.js ./exports/customer-rehearsal
```

Each run requires a new output directory. Collections are read in batches of 500. An error exits with a nonzero status; partial exports have no usable `manifest.json` and must not be imported. Source version checks detect selected legacy fields, but are not a substitute for confirming that all upstream upgrades ran.

The source database must contain `Workspaces`, `Users` and `WorkspaceUsers`; a missing collection blocks export.

The completed manifest lists table columns, row counts and SHA-256 file hashes. Keep the export intact and protect it as customer data: it contains password hashes, tokens and configuration secrets.

## 3. Generate and execute import

```bash
node get-scripts.js ./exports/customer-rehearsal
psql "$POSTGRES_CONNECTION_STRING" -v ON_ERROR_STOP=1 -f ./exports/customer-rehearsal/scripts-to-run.sql
```

Export and import use `.env` for the Node.js commands. Shell commands require the connection variables to be set in the shell separately; `psql` does not load `.env`.

Script generation checks CSV hashes and manifest completeness. Import specifies columns explicitly and runs in one transaction, locking target tables, rejecting nonempty tables again, checking imported counts, and verifying core membership relationships before committing. On failure, the transaction is rolled back. Fix the cause and retry with a fresh export when necessary.

`\copy` reads absolute CSV paths on the machine running `psql`. Keep the export at that location; if moved, regenerate the script. Windows path separators are normalized to forward slashes. Paths containing single quotes or line breaks are rejected; literal backslashes in POSIX paths are also rejected. Do not execute individual copy commands outside the generated transaction.

## 4. Rehearse, cut over and roll back

Follow the [customer runbook](docs/migration-runbook.md). A successful import is only one acceptance criterion. Validate login/passwords, workspace and organization membership, permissions, environment secrets/settings, representative SDK evaluations, experiments and integrations against the source deployment.

Formal release requires customer-copy rehearsal and application acceptance. Synthetic tests do not replace those checks.

## Development validation

```bash
npm run test:unit
npm run test:integration
```

The integration test requires Docker. It starts isolated `mongo:5.0.32` and `postgres:15.10` containers on random loopback ports and removes them afterward. It never uses the connection strings in `.env`. It initializes the official schema, checks every mapped column, exports/imports 58 synthetic records across 29 collections, checks critical round trips, and exercises failure guards.

No test can establish compatibility with all customer data or external analytics stores. Record actual rehearsal duration, storage requirements and acceptance results before scheduling the production window.

To test initialization with an existing local source checkout and no clone:

```bash
FEATBIT_CHECKOUT=/path/to/featbit-v5.4.10 npm run test:integration
```
