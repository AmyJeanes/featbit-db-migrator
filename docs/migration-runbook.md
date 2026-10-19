# Customer migration runbook: FeatBit 5.4.10

## Prepare

1. Record the deployed versions of all FeatBit services and the MongoDB database name. Confirm all upstream upgrades have been applied, not merely that the containers use a 5.4.10 image.
2. Agree on data scope. This tool includes usage summaries but excludes EndUsers, Events, refresh tokens and transient queue messages. Determine where analytics data actually resides and how it will remain available. Define an explicit policy for excluded end-user data before SDK traffic resumes.
3. Back up MongoDB, application configuration, signing keys and external analytics storage. Verify backup restoration. Keep the original deployment intact for rollback.
4. Restore a database copy into an isolated environment. Initialize a fresh PostgreSQL target using `npm run init:pg` (optionally pass the verified FeatBit 5.4.10 checkout); do not use the standard seeded deployment database.
5. Run the export and transactional import as documented in README. Record counts, elapsed time, export size, target size and all errors. Retain the manifest with the acceptance record.

## Rehearsal acceptance

- Compare each collection's snapshot count with the manifest and imported count. Check IDs and representative business records, not just counts.
- Verify that a user belonging to multiple workspaces retains all memberships and can switch workspaces. Check organization membership, invitations and password/initial-password behavior.
- Check policies and segments retain their original keys, built-in and custom permissions work, and access tokens have the same intended authorization.
- Check environment secrets and settings, feature-flag rules, target users, fallthrough, revisions and segment references. Run representative SDK evaluations with the same inputs against both isolated deployments and compare results.
- Check experiments, metrics, relay agents and webhooks without sending real customer notifications. Validate usage-summary dates and totals.
- Confirm the treatment of excluded EndUsers/Events meets the agreed requirements. Verify reconnect/login behavior and cache/message-queue configuration for the chosen deployment topology.

## Production window

1. Stop customer configuration changes and pause every writer to MongoDB: API, evaluation services/SDK ingestion, scheduled/background jobs, and any scripts. Drain pending work first. Record the cutover timestamp and take the final consistent backup/snapshot. This utility does not capture concurrent changes or perform a delta sync.
2. Export from that frozen source and import into a fresh initialized target. Any failed export or import blocks cutover; review the error and preserve logs.
3. Confirm the count and relationship checks pass, then perform the agreed record-level checks. Do not rerun upstream historical data migrations on imported records.
4. Configure all FeatBit 5.4.10 services for the target PostgreSQL deployment and the correct queue/cache/analytics topology. Reconcile shared caches according to that topology so stale source state cannot override the target. Keep external integrations disabled during initial acceptance.
5. Validate login, workspaces, authorization and SDK evaluation. Users must obtain new refresh-token sessions; existing access JWTs depend on signing keys and expiry. Resume traffic and integrations only after acceptance.

## Rollback

Before admitting new writes to PostgreSQL, rollback means stopping the new services, restoring the original database configuration, and restarting the original deployment against the retained MongoDB snapshot/state.

After PostgreSQL accepts writes, switching back can lose new changes. Freeze writes, assess and reconcile the post-cutover changes, then execute the separately agreed recovery procedure. This tool provides no reverse or bidirectional migration.

Do not delete the source, backups or export artifacts until the agreed retention/acceptance period expires.
