/**
 * Microsoft Graph API — App-Only (Client Credentials)
 *
 * Required Azure AD application permissions:
 *   - User.Read.All
 *   - User.ReadWrite.All  (required for pushUserToEntra)
 *
 * Environment variables:
 *   AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
 */

import { getGraphToken } from "@/lib/graph-token";

export interface GraphUser {
  id: string;
  displayName: string | null;
  mail: string | null;
  userPrincipalName: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
  accountEnabled: boolean | null;
}

const SELECT_FIELDS = [
  "id",
  "displayName",
  "mail",
  "userPrincipalName",
  "employeeId",
  "department",
  "jobTitle",
  "accountEnabled",
].join(",");

/**
 * Fetch all M365-licensed member accounts from Entra ID.
 *
 * Server-side filters:
 *   - accountEnabled eq true
 *   - userType eq 'Member'          — excludes guests / external accounts
 *   - assignedLicenses/$count ne 0  — only users with at least one M365 license
 *
 * Handles OData pagination via @odata.nextLink automatically.
 */
export async function fetchAllEntraUsers(): Promise<GraphUser[]> {
  const token = await getGraphToken();

  const params = new URLSearchParams({
    $select: SELECT_FIELDS,
    $top: "999",
    $count: "true",
    $filter: [
      "accountEnabled eq true",
      "userType eq 'Member'",
      "assignedLicenses/$count ne 0",
    ].join(" and "),
    $orderby: "displayName asc",
  });

  const users: GraphUser[] = [];
  let url: string | null =
    `https://graph.microsoft.com/v1.0/users?${params.toString()}`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        // Required for advanced query operators ($count, nested $filter)
        ConsistencyLevel: "eventual",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Graph API ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      value: GraphUser[];
      "@odata.nextLink"?: string;
    };

    users.push(...json.value);
    url = json["@odata.nextLink"] ?? null;
  }

  return users;
}

export interface GraphGroup {
  id: string;
  displayName: string;
  mail: string | null;
  description: string | null;
}

/**
 * Fetch all M365-enabled groups (mailEnabled = true) from Entra ID.
 * Requires Group.Read.All app permission.
 */
export async function fetchAllEntraGroups(): Promise<GraphGroup[]> {
  const token = await getGraphToken();

  const params = new URLSearchParams({
    $select: "id,displayName,mail,description",
    $top: "999",
    $filter: "mailEnabled eq true",
  });

  const groups: GraphGroup[] = [];
  let url: string | null =
    `https://graph.microsoft.com/v1.0/groups?${params.toString()}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Graph API ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      value: GraphGroup[];
      "@odata.nextLink"?: string;
    };

    groups.push(...json.value);
    url = json["@odata.nextLink"] ?? null;
  }

  groups.sort((a, b) => a.displayName.localeCompare(b.displayName, "th"));
  return groups;
}

/**
 * Search mail-enabled Entra ID groups by displayName or mail (uses $search).
 * Returns up to 25 results sorted by displayName.
 */
export async function searchEntraGroups(query: string): Promise<GraphGroup[]> {
  if (!query.trim()) return [];

  const token = await getGraphToken();

  const params = new URLSearchParams({
    $select: "id,displayName,mail,description",
    $top: "25",
    $count: "true",
    $search: `"displayName:${query}" OR "mail:${query}"`,
  });

  const res = await fetch(`https://graph.microsoft.com/v1.0/groups?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ConsistencyLevel: "eventual",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph searchGroups ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { value: GraphGroup[] };
  return json.value;
}

/**
 * Search Entra ID users by displayName or mail (uses $search).
 * Returns up to 25 results sorted by displayName.
 */
export async function searchEntraUsers(query: string): Promise<GraphUser[]> {
  if (!query.trim()) return [];

  const token = await getGraphToken();

  const params = new URLSearchParams({
    $select: SELECT_FIELDS,
    $top: "25",
    $search: `"displayName:${query}" OR "mail:${query}" OR "employeeId:${query}"`,
    $filter: "accountEnabled eq true and userType eq 'Member'",
    $orderby: "displayName asc",
  });

  const res = await fetch(`https://graph.microsoft.com/v1.0/users?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ConsistencyLevel: "eventual",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { value: GraphUser[] };
  return json.value;
}

export interface PushUserPayload {
  displayName?: string;
  department?: string | null;
  employeeId?: string | null;
  jobTitle?: string | null;
}

/**
 * PATCH /v1.0/users/{msUserId}
 *
 * Pushes local user field changes back to Microsoft Entra ID.
 * Requires User.ReadWrite.All app permission.
 * Graph PATCH with an empty body is a no-op — caller must ensure at least one field.
 */
export async function pushUserToEntra(msUserId: string, payload: PushUserPayload): Promise<void> {
  const token = await getGraphToken();

  const body: Record<string, string | null> = {};

  // displayName: must be non-empty string
  if (payload.displayName) body.displayName = payload.displayName;

  // department: Graph accepts null (clears it) or a non-empty string
  if (payload.department !== undefined) body.department = payload.department || null;

  // employeeId: Graph requires 1–16 chars; null/empty → omit entirely (leave unchanged)
  if (payload.employeeId) body.employeeId = payload.employeeId;

  // jobTitle: Graph accepts null (clears it) or a non-empty string
  if (payload.jobTitle !== undefined) body.jobTitle = payload.jobTitle || null;

  if (Object.keys(body).length === 0) return;

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${msUserId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph PATCH users/${msUserId} ${res.status}: ${text}`);
  }
}
