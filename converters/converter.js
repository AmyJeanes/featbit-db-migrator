import { ColumnsConverter } from "./columnsConverter.js";
import { UsersConverter } from "./usersConverter.js";
import { SegmentsConverter } from "./segmentsConverter.js";
import { FeatureFlagsConverter } from "./featureFlagsConverter.js";
import { FlagSchedulesConverter } from "./flagSchedulesConverter.js";
import { FlagChangeRequestsConverter } from "./flagChangeRequestsConverter.js";
import { TriggersConverter } from "./triggersConverter.js";
import { AuditLogsConverter } from "./audditLogsConverter.js";
import { FlagRevisionsConverter } from "./flagRevisionsConverter.js";
import { FlagDraftsConverter } from "./flagDraftsConverter.js";
import { WorkspacesConverter } from "./workspacesConverter.js";
import { OrganizationsConverter } from "./organizationsConverter.js";
import { OrganizationUsersConverter } from "./organizationUsersConverter.js";
import { ProjectsConverter } from "./projectsConverter.js";
import { EnvironmentsConverter } from "./environmentsConverter.js";
import { EndUserPropertiesConverter } from "./endUserPropertiesConverter.js";

import { GroupConverter } from "./groupConverter.js";
import { PolicyConverter } from "./policyConverter.js";
import { GroupMemberConverter } from "./groupMemberConverter.js";
import { GroupPolicyConverter } from "./groupPolicyConverter.js";
import { MemberPolicyConverter } from "./memberPolicyConverter.js";

import { ExperimentConverter } from "./experimentConverter.js";
import { ExperimentMetricConverter } from "./experimentMetricConverter.js";

import { AccessTokenConverter } from "./accessTokenConverter.js";
import { RelayProxyConverter } from "./relayProxyConverter.js";
import { WebhooksConverter } from "./webhooksConverter.js";
import { WebhookDeliveryConverter } from "./webhookDeliveryConverter.js";

export class Converter {
    static getConverter(collection) {
        switch (collection) {
            case "WorkspaceUsers":
                return new ColumnsConverter(["id", "workspace_id", "user_id", "created_at", "updated_at"]);
            case "UsageEndUserStats":
                return new ColumnsConverter(["env_id", "year_month", "user_key", "first_seen_at"]);
            case "UsageEventStats":
                return new ColumnsConverter(["env_id", "stats_date", "flag_evaluations", "custom_metrics"]);
            case "Users":
                return new UsersConverter();

            case "Workspaces":
                return new WorkspacesConverter();

            case "Organizations":
                return new OrganizationsConverter();
            case "OrganizationUsers":
                return new OrganizationUsersConverter();
            case "Projects":
                return new ProjectsConverter();
            case "Environments":
                return new EnvironmentsConverter();
            case "EndUserProperties":
                return new EndUserPropertiesConverter();
            case "Segments":
                return new SegmentsConverter();
            case "FeatureFlags":
                return new FeatureFlagsConverter();
            case "FlagRevisions":
                return new FlagRevisionsConverter();
            case "FlagDrafts":
                return new FlagDraftsConverter();
            case "FlagSchedules":
                return new FlagSchedulesConverter();
            case "FlagChangeRequests":
                return new FlagChangeRequestsConverter();
            case "Triggers":
                return new TriggersConverter();
            case "AuditLogs":
                return new AuditLogsConverter();

            case "Groups":
                return new GroupConverter();
            case "Policies":
                return new PolicyConverter();
            case "GroupMembers":
                return new GroupMemberConverter();
            case "GroupPolicies":
                return new GroupPolicyConverter();
            case "MemberPolicies":
                return new MemberPolicyConverter();

            case "Experiments":
                return new ExperimentConverter();
            case "ExperimentMetrics":
                return new ExperimentMetricConverter();

            case "AccessTokens":
                return new AccessTokenConverter();
            case "RelayProxies":
                return new RelayProxyConverter();
            case "Webhooks":
                return new WebhooksConverter();
            case "WebhookDeliveries":
                return new WebhookDeliveryConverter();
            default:
                throw new Error(`No converter found for collection: ${collection}`);
        }
    }
}