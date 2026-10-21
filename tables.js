export const TABLE_MAPPING = [
  { Workspaces: "workspaces" },

  { Users: "users" },
  { WorkspaceUsers: "workspace_users" },

  { Organizations: "organizations" },
  { OrganizationUsers: "organization_users" },
  { Projects: "projects" },
  { Environments: "environments" },
  { EndUserProperties: "end_user_properties" },
  { Segments: "segments" },
  { FeatureFlags: "feature_flags" },
  { FlagRevisions: "flag_revisions" },
  { FlagDrafts: "flag_drafts" },
  { FlagSchedules: "flag_schedules" },
  { FlagChangeRequests: "flag_change_requests" },
  { Triggers: "triggers" },
  { AuditLogs: "audit_logs" },

  { Groups: "groups" },
  { Policies: "policies" },
  { GroupMembers: "group_members" },
  { GroupPolicies: "group_policies" },
  { MemberPolicies: "member_policies" },

  { Experiments: "experiments" },
  { ExperimentMetrics: "experiment_metrics" },

  { AccessTokens: "access_tokens" },
  { RelayProxies: "relay_proxies" },
  { Webhooks: "webhooks" },
  { WebhookDeliveries: "webhook_deliveries" },

  { UsageEndUserStats: "usage_end_user_stats" },
  { UsageEventStats: "usage_event_stats" },

  // EndUsers, Events, RefreshTokens and QueueMessages are intentionally excluded.
  // { EndUsers: "end_users" },
  // { Events: "events" },
  // { RefreshTokens: "refresh_tokens" },
  // { QueueMessages: "queue_messages" },
];
