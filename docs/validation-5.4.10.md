# Validation record — 2026-10-18

Implementation branch: `feat/migrate-featbit-5.4.10`.
Upstream reviewed: `100d585e481fca3413468cbc6a9c70eb5246cc60` (FeatBit 5.4.10).

Latest unit and integration verification: 2026-10-19.

## Completed

- `npm test`: 7 unit tests passed, covering nested BSON UUID/binary decoding, large integer representation, CSV quoting, PostgreSQL arrays, moved user fields legacy source guards, and strict seed-section exclusion.
- `npm run test:integration`: passed using isolated MongoDB 5.0.32 and PostgreSQL 15.10 Docker containers. Containers and temporary exports were removed afterward.
- The integration test clones/verifies the pinned upstream source and executes its SQL files in version order, excluding the base seed-data section, then compares every exported column with the actual schema across all 29 mapped tables.
- 58 synthetic records are exported with batch size 1 and imported through generated `psql` commands. Each table count and every ID-based table's ID set is checked.
- Explicit assertions cover password hashes and initial passwords, user/workspace membership joins, nested flag UUIDs, original environment settings, Unicode, CR/LF, delimiters, quotes, backslashes, null fields, empty strings and array null elements.
- Usage fixtures share an environment ID while retaining distinct composite keys, exercising both new statistics tables without assuming an `id` column.
- Initialization checks confirm seed tables remain empty and that a failed script prevents any later script from running.
- Failure checks cover a missing source collection, legacy user shape, missing export manifest, CSV checksum mismatch, output-directory reuse and populated targets at export and import.
- A deliberately orphaned workspace membership causes import failure; a subsequent query confirms earlier copied user rows were rolled back. The corrected export imports successfully afterward.
- `git diff --check`: passed.

## Still required before release

- Rehearsal against a consistent customer database copy, including representative record-level comparison and performance/storage measurements.
- Login, authorization, workspace switching, representative SDK evaluation, experiments and integration acceptance in an isolated FeatBit 5.4.10 deployment.
- Customer agreement on excluded end-user records, raw events, refresh-token sessions and transient queue work.
- Review of the production topology and execution of the cutover/rollback checklist.

These synthetic database tests establish conversion and import behavior for the exercised cases. They do not establish application acceptance, complete business-semantic equivalence, or readiness for an untested customer dataset. No customer database was accessed, and no v5.4.10 tag or release was published.
