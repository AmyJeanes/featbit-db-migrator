# FeatBit 5.4.10 migration mapping

Source: FeatBit tag v5.4.10, commit 100d585e481fca3413468cbc6a9c70eb5246cc60.

Supported path: upgraded MongoDB 5.4.10 to a fresh PostgreSQL 5.4.10 schema. This tool does not upgrade old MongoDB data.

## Changes from the 5.2.0 tool

- Policies and Segments: preserve existing key; do not regenerate it from name.
- Users: remove workspaceId; preserve initialPassword and existing password hashes.
- OrganizationUsers: remove initialPassword; preserve canonical userId and invitorId.
- WorkspaceUsers: new mapping; preserve IDs and workspace/user associations already established by the source upgrade. Do not run user deduplication again.
- Environments: preserve settings as an object; do not reset imported settings.
- UsageEndUserStats and UsageEventStats: migrate all records into tables keyed by (env_id, year_month, user_key) and (env_id, stats_date), respectively. MongoDB ObjectId is not a target key.
- Permissions: preserve source statements, corrected built-in policy IDs and token permissions; do not replay historical permission upgrades after importing.
- PostgreSQL: apply official schema upgrades through v5.4.1 before import, including refresh-token and usage tables, user restructuring, pg_trgm indexes and audit keyword varchar(512). The v5.4.10 tag contains no later SQL upgrade scripts.

## Complete table/column mapping

All listed columns were compared with a PostgreSQL 15 database initialized by running the official scripts from the pinned upstream checkout. No missing or extra columns were found across the 29 mapped tables. SQL snake_case columns map to MongoDB camelCase, except id maps to _id. The upstream spelling is_arvhived is intentional.

| MongoDB collection | PostgreSQL table | Exported columns |
|---|---|---|
| Workspaces | workspaces | id, name, key, license, sso, created_at, updated_at |
| Users | users | id, name, email, password, origin, initial_password, created_at, updated_at |
| WorkspaceUsers | workspace_users | id, workspace_id, user_id, created_at, updated_at |
| Organizations | organizations | id, workspace_id, name, key, initialized, license, default_permissions, created_at, updated_at, settings |
| OrganizationUsers | organization_users | id, organization_id, user_id, invitor_id, created_at, updated_at |
| Projects | projects | id, organization_id, name, key, created_at, updated_at |
| Environments | environments | id, project_id, name, key, description, secrets, settings, created_at, updated_at |
| EndUserProperties | end_user_properties | id, env_id, name, preset_values, use_preset_values_only, is_built_in, is_digest_field, remark, created_at, updated_at |
| Segments | segments | id, workspace_id, env_id, name, key, type, scopes, description, included, excluded, rules, is_archived, created_at, updated_at, tags |
| FeatureFlags | feature_flags | id, env_id, revision, name, description, key, variation_type, variations, target_users, rules, is_enabled, disabled_variation_id, fallthrough, expt_include_all_targets, tags, is_archived, created_at, updated_at, creator_id, updator_id |
| FlagRevisions | flag_revisions | id, flag, comment |
| FlagDrafts | flag_drafts | id, env_id, flag_id, status, comment, data_change, created_at, updated_at, creator_id, updator_id |
| FlagSchedules | flag_schedules | id, org_id, env_id, flag_draft_id, flag_id, status, title, scheduled_time, change_request_id, created_at, updated_at, creator_id, updator_id |
| FlagChangeRequests | flag_change_requests | id, org_id, env_id, flag_draft_id, flag_id, status, reason, reviewers, schedule_id, created_at, updated_at, creator_id, updator_id |
| Triggers | triggers | id, target_id, type, action, token, description, is_enabled, triggered_times, last_triggered_at, created_at, updated_at |
| AuditLogs | audit_logs | id, env_id, ref_id, ref_type, keyword, operation, data_change, comment, creator_id, created_at |
| Groups | groups | id, organization_id, name, description, created_at, updated_at |
| Policies | policies | id, organization_id, name, key, description, type, statements, created_at, updated_at |
| GroupMembers | group_members | id, group_id, organization_id, member_id, created_at, updated_at |
| GroupPolicies | group_policies | id, group_id, policy_id, created_at, updated_at |
| MemberPolicies | member_policies | id, organization_id, member_id, policy_id, created_at, updated_at |
| Experiments | experiments | id, env_id, metric_id, feature_flag_id, is_archived, status, baseline_variation_id, iterations, alpha, created_at, updated_at |
| ExperimentMetrics | experiment_metrics | id, env_id, name, description, maintainer_user_id, event_name, event_type, custom_event_track_option, custom_event_unit, custom_event_success_criteria, element_targets, target_urls, is_arvhived, created_at, updated_at |
| AccessTokens | access_tokens | id, organization_id, name, type, status, token, creator_id, permissions, last_used_at, created_at, updated_at |
| RelayProxies | relay_proxies | id, organization_id, name, key, description, is_all_envs, scopes, agents, created_at, updated_at, auto_agents |
| Webhooks | webhooks | id, org_id, name, url, scopes, events, headers, payload_template_type, payload_template, secret, is_active, prevent_empty_payloads, last_delivery, created_at, updated_at, creator_id, updator_id |
| WebhookDeliveries | webhook_deliveries | id, webhook_id, success, events, request, response, error, started_at, ended_at |
| UsageEndUserStats | usage_end_user_stats | env_id, year_month, user_key, first_seen_at |
| UsageEventStats | usage_event_stats | env_id, stats_date, flag_evaluations, custom_metrics |

## Conversion rules

- BSON subtype-4 UUIDs become standard UUID strings, including nested JSON references. Dates retain UTC; statistics date columns are imported as dates. BSON Long values retain decimal precision.
- Null and empty string remain distinct. CSV uses pipe separators, UTF-8 and doubled quotes. PostgreSQL string arrays escape backslashes and quotes and distinguish null elements from the literal NULL.
- Existing per-collection JSON normalization changes embedded _id to id where required (for example flag revisions, rules, policy statements, relay agents). Business JSON such as settings is otherwise preserved.
- Existing optional defaults are retained: user origin Local when absent; organization settings/default permissions; webhook preventEmptyPayloads=false. Missing nullable JSON fields remain null. Null or missing PostgreSQL string-array fields retain the original empty-array default. Missing required fields fail at import rather than being invented.

## Explicit exclusions

| Data | Decision |
|---|---|
| EndUsers | Not included; requires a separate volume, retention and validation plan. EndUserProperties metadata is included. |
| Events / analytics history | Not included; assess the deployment's analytics storage separately. Usage summary tables are included. |
| RefreshTokens | Not included; users must log in again. Check signing-key and existing access-token lifetime behavior during cutover. |
| QueueMessages | Not included; drain asynchronous work before the final snapshot. |

## Validation limits

The tool checks source shape for changed fields, rejects nonempty targets, verifies all mapped target columns, checks CSV hashes before generating scripts, compares imported counts, and checks workspace, organization, project and environment relationships before committing. It does not prove every source document satisfies every business invariant or that concurrent writes were absent. Customer-copy rehearsal and application/SDK acceptance remain required.
