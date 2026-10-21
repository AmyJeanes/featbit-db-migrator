import { EndUsersConverter } from "./endUsersConverter.js";
import { WorkspaceUsersConverter } from "./workspaceUsersConverter.js";
import { UsageEndUserStatsConverter } from "./usageEndUserStatsConverter.js";
import { UsageEventStatsConverter } from "./usageEventStatsConverter.js";
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

const converters = new Map([
    ["EndUsers", EndUsersConverter],
    ["WorkspaceUsers", WorkspaceUsersConverter],
    ["UsageEndUserStats", UsageEndUserStatsConverter],
    ["UsageEventStats", UsageEventStatsConverter],
    ["Users", UsersConverter],
    ["Workspaces", WorkspacesConverter],
    ["Organizations", OrganizationsConverter],
    ["OrganizationUsers", OrganizationUsersConverter],
    ["Projects", ProjectsConverter],
    ["Environments", EnvironmentsConverter],
    ["EndUserProperties", EndUserPropertiesConverter],
    ["Segments", SegmentsConverter],
    ["FeatureFlags", FeatureFlagsConverter],
    ["FlagRevisions", FlagRevisionsConverter],
    ["FlagDrafts", FlagDraftsConverter],
    ["FlagSchedules", FlagSchedulesConverter],
    ["FlagChangeRequests", FlagChangeRequestsConverter],
    ["Triggers", TriggersConverter],
    ["AuditLogs", AuditLogsConverter],
    ["Groups", GroupConverter],
    ["Policies", PolicyConverter],
    ["GroupMembers", GroupMemberConverter],
    ["GroupPolicies", GroupPolicyConverter],
    ["MemberPolicies", MemberPolicyConverter],
    ["Experiments", ExperimentConverter],
    ["ExperimentMetrics", ExperimentMetricConverter],
    ["AccessTokens", AccessTokenConverter],
    ["RelayProxies", RelayProxyConverter],
    ["Webhooks", WebhooksConverter],
    ["WebhookDeliveries", WebhookDeliveryConverter],
]);

export class Converter {
    static getConverter(collection) {
        const ConverterClass = converters.get(collection);
        if (!ConverterClass) {
            throw new Error(`No converter found for collection: ${collection}`);
        }
        return new ConverterClass();
    }
}
