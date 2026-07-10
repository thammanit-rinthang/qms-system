import { UnauthorizedError } from "@/lib/errors";

/**
 * Auth Center consumer API client for QMS operations.
 *
 * Preferred mode:
 * - Forward the logged-in user's Auth Center bearer token
 * - Auth Center authorizes based on app-scoped roles in that token
 *
 * Compatibility fallback:
 * - If no user token is available, QMS can still log in as a dedicated local admin
 *   account via AUTH_CENTER_ADMIN_EMPLOYEE_ID + AUTH_CENTER_ADMIN_PASSWORD.
 *
 * Endpoints used:
 *   GET    /api/auth/consumer/users?appId=qms        — list users with QMS roles
 *   GET    /api/auth/consumer/role-grants?appId=qms  — list active role grants
 *   POST   /api/auth/consumer/role-grants             — grant a QMS role to a user
 *   GET    /api/auth/consumer/departments?appId=qms  — list departments
 *   POST   /api/auth/consumer/departments             — create department
 *   PATCH  /api/auth/consumer/departments             — update department by code
 *   DELETE /api/auth/consumer/departments?appId=...&code=... — delete department
 *   DELETE /api/auth/consumer/role-grants          — revoke a QMS role from a user
 *   GET   /api/auth/consumer/users/:id/profile       — read user profile via M2M
 *   PATCH /api/auth/consumer/users/:id/profile       — update user profile via M2M (preferred)
 *   PATCH /api/auth/profile/me                       — update own profile (uses user's own token, optional)
 */

function getBaseUrl(): string {
  const url = process.env.AUTH_CENTER_URL;
  if (!url) throw new Error("AUTH_CENTER_URL is not configured");
  return url.replace(/\/$/, "");
}

function getAppId(): string {
  return process.env.AUTH_CENTER_APP_ID ?? "qms";
}

export type AuthCenterClientAuthOptions = {
  accessToken?: string | null;
};

function getForwardedToken(options?: AuthCenterClientAuthOptions): string | null {
  return options?.accessToken?.trim() || null;
}


function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function resolveAuthHeaders(options?: AuthCenterClientAuthOptions) {
  const forwardedToken = getForwardedToken(options);
  if (forwardedToken) {
    return authHeaders(forwardedToken);
  }

  // Delegated-only mode: all Auth Center API calls must use the user's session access token.
  // M2M fallback is intentionally removed. Pass accessToken from session.user.accessToken.
  throw new Error(
    "Auth Center API requires a delegated access token. Pass session.user.accessToken via the options parameter.",
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuthCenterUser = {
  id: string;
  employeeId: string | null;
  email: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  roles: string[];
};

export type AuthCenterAppMember = {
  id: string;
  employeeId: string | null;
  email: string | null;
  displayName: string | null;
  m365Linked: boolean;
};

export type AuthCenterRoleGrant = {
  id: string;
  userId: string;
  employeeId: string | null;
  userEmail: string | null;
  displayName: string | null;
  role: string;
  appId: string;
  grantedAt: string;
};

// ─── User list ───────────────────────────────────────────────────────────────

/**
 * Create a new user in Auth Center.
 * Returns the created user's Auth Center id and employeeId.
 */
export async function createAuthCenterUser(data: {
  employeeId: string;
  displayName?: string;
  email?: string;
  departmentCode?: string;
  department?: string;
  jobTitle?: string;
  initialPassword?: string;
}, options?: AuthCenterClientAuthOptions): Promise<{ id: string; employeeId: string | null; email: string | null; displayName: string | null }> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/users`, {
    method: "POST",
    headers: await resolveAuthHeaders(options),
    body: JSON.stringify({ appId, ...data }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center create user failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: { id: string; employeeId: string | null; email: string | null; displayName: string | null } };
  return json.data!;
}

/**
 * List all users registered in Auth Center that have access to this app.
 * Uses the consumer endpoint which returns roles scoped to the app.
 */
export async function listAuthCenterUsers(options?: AuthCenterClientAuthOptions): Promise<AuthCenterUser[]> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/users?appId=${encodeURIComponent(appId)}`, {
    headers: await resolveAuthHeaders(options),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center user list failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: AuthCenterUser[] };
  return json.data ?? [];
}

/**
 * List active people visible to this app.
 * Unlike /consumer/users, this endpoint is not limited to current role grants and
 * includes the M365 link status used by recipient pickers and admin UI badges.
 */
export async function listAuthCenterAppMembers(options?: AuthCenterClientAuthOptions): Promise<AuthCenterAppMember[]> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/app-members?appId=${encodeURIComponent(appId)}`, {
    headers: await resolveAuthHeaders(options),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center app members failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: AuthCenterAppMember[] };
  return json.data ?? [];
}

// ─── Role grants ─────────────────────────────────────────────────────────────

/**
 * List active QMS role grants from Auth Center.
 */
export async function listAuthCenterRoleGrants(options?: AuthCenterClientAuthOptions): Promise<AuthCenterRoleGrant[]> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/role-grants?appId=${encodeURIComponent(appId)}`, {
    headers: await resolveAuthHeaders(options),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center role grants list failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: AuthCenterRoleGrant[] };
  return json.data ?? [];
}

/**
 * Grant a QMS role to a user in Auth Center.
 * Replaces any existing QMS role for this user (one-role-per-app rule enforced by Auth Center).
 */
export async function grantAuthCenterRole(userId: string, role: string, options?: AuthCenterClientAuthOptions): Promise<void> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/role-grants`, {
    method: "POST",
    headers: await resolveAuthHeaders(options),
    body: JSON.stringify({ userId, appId, role }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center grant role failed (${res.status}): ${text}`);
  }
}

/**
 * Revoke a specific role grant by grantId.
 */
export async function revokeAuthCenterRoleGrant(grantId: string, options?: AuthCenterClientAuthOptions): Promise<void> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/role-grants`, {
    method: "DELETE",
    headers: await resolveAuthHeaders(options),
    body: JSON.stringify({ userId: "", appId, role: "", grantId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center revoke role failed (${res.status}): ${text}`);
  }
}

// ─── User profile via M2M (preferred — no user token needed) ─────────────────

/**
 * Read a user's profile from Auth Center using M2M token.
 * Used for self-profile GET in auth_center mode.
 */
export async function getAuthCenterUserProfile(authUserId: string, options?: AuthCenterClientAuthOptions): Promise<{
  email: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  officeLocation: string | null;
  mobilePhone: string | null;
  employeeId: string | null;
} | null> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(
    `${base}/api/auth/consumer/users/${encodeURIComponent(authUserId)}/profile?appId=${encodeURIComponent(appId)}`,
    { headers: await resolveAuthHeaders(options), cache: "no-store" },
  );

  if (!res.ok) return null;

  const json = await res.json() as { data?: Record<string, unknown> };
  const d = json.data ?? {};
  return {
    email: (d.email as string | null) ?? null,
    displayName: (d.displayName as string | null) ?? null,
    department: (d.department as string | null) ?? null,
    jobTitle: (d.jobTitle as string | null) ?? null,
    officeLocation: (d.officeLocation as string | null) ?? null,
    mobilePhone: (d.mobilePhone as string | null) ?? null,
    employeeId: (d.employeeId as string | null) ?? null,
  };
}

/**
 * Update a user's profile in Auth Center using M2M token.
 * Replaces the user-token-based approach for self-profile PATCH.
 */
export async function updateAuthCenterUserProfileM2M(
  authUserId: string,
  data: {
    displayName?: string;
    department?: string | null;
    jobTitle?: string | null;
    officeLocation?: string | null;
    mobilePhone?: string | null;
  },
  options?: AuthCenterClientAuthOptions,
): Promise<void> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(
    `${base}/api/auth/consumer/users/${encodeURIComponent(authUserId)}/profile`,
    {
      method: "PATCH",
      headers: await resolveAuthHeaders(options),
      body: JSON.stringify({ appId, ...data }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center profile update (M2M) failed (${res.status}): ${text}`);
  }
}

// ─── Profile (user's own session token) ──────────────────────────────────────

/**
 * Update the logged-in user's own profile in Auth Center.
 * Uses the user's own session access token (not M2M).
 */
export async function updateAuthCenterProfile(
  userAccessToken: string,
  data: {
    displayName?: string;
    department?: string;
    jobTitle?: string;
    officeLocation?: string;
    mobilePhone?: string;
  },
): Promise<void> {
  const base = getBaseUrl();

  const res = await fetch(`${base}/api/auth/profile/me`, {
    method: "PATCH",
    headers: authHeaders(userAccessToken),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center profile update failed (${res.status}): ${text}`);
  }
}

/**
 * Fetch the logged-in user's own profile from Auth Center /api/auth/me.
 */
export async function getAuthCenterMe(
  userAccessToken: string,
): Promise<{
  email: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  officeLocation: string | null;
  mobilePhone: string | null;
  employeeId: string | null;
} | null> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/me?appId=${encodeURIComponent(appId)}`, {
    headers: authHeaders(userAccessToken),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = await res.json() as { data?: Record<string, unknown> };
  const d = json.data ?? {};
  return {
    email: (d.email as string | null) ?? null,
    displayName: (d.displayName as string | null) ?? null,
    department: (d.department as string | null) ?? null,
    jobTitle: (d.jobTitle as string | null) ?? null,
    officeLocation: (d.officeLocation as string | null) ?? null,
    mobilePhone: (d.mobilePhone as string | null) ?? null,
    employeeId: (d.employeeId as string | null) ?? null,
  };
}

// ─── Departments ──────────────────────────────────────────────────────────────

export type AuthCenterDepartment = {
  id: string;
  code: string;
  displayName: string;
  emailGroup: string | null;
  userCount: number;
  source: string;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * List all departments from Auth Center.
 */
export async function listAuthCenterDepartments(options?: AuthCenterClientAuthOptions): Promise<AuthCenterDepartment[]> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(
    `${base}/api/auth/consumer/departments?appId=${encodeURIComponent(appId)}`,
    { headers: await resolveAuthHeaders(options), cache: "no-store" },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) throw new UnauthorizedError();
    throw new Error(`Auth Center department list failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: AuthCenterDepartment[] };
  return json.data ?? [];
}

/**
 * Create a department in Auth Center.
 * `code` will be auto-uppercased by Auth Center.
 */
export async function createAuthCenterDepartment(data: {
  code: string;
  displayName: string;
}, options?: AuthCenterClientAuthOptions): Promise<AuthCenterDepartment> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/departments`, {
    method: "POST",
    headers: await resolveAuthHeaders(options),
    body: JSON.stringify({ appId, ...data }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center create department failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: AuthCenterDepartment };
  return json.data!;
}

/**
 * Update a department in Auth Center by code.
 */
export async function updateAuthCenterDepartment(
  code: string,
  data: { displayName?: string },
  options?: AuthCenterClientAuthOptions,
): Promise<AuthCenterDepartment> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(`${base}/api/auth/consumer/departments`, {
    method: "PATCH",
    headers: await resolveAuthHeaders(options),
    body: JSON.stringify({ appId, code, ...data }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center update department failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: AuthCenterDepartment };
  return json.data!;
}

// ─── Department members ───────────────────────────────────────────────────────

export type AuthCenterDepartmentMember = {
  id: string;
  employeeId: string | null;
  email: string | null;
  displayName: string | null;
  jobTitle: string | null;
  officeLocation: string | null;
  m365Linked: boolean;
  roles: string[];
};

/**
 * List members of a department from Auth Center by department code.
 */
export async function getAuthCenterDepartmentMembers(code: string, options?: AuthCenterClientAuthOptions): Promise<{
  department: { code: string; displayName: string; userCount: number };
  members: AuthCenterDepartmentMember[];
  source: string;
} | null> {
  const base = getBaseUrl();
  const appId = getAppId();

  const res = await fetch(
    `${base}/api/auth/consumer/departments/${encodeURIComponent(code)}/members?appId=${encodeURIComponent(appId)}`,
    { headers: await resolveAuthHeaders(options), cache: "no-store" },
  );

  if (!res.ok) return null;

  const json = await res.json() as { data?: { department: { code: string; displayName: string; userCount: number }; members: AuthCenterDepartmentMember[]; source: string } };
  return json.data ?? null;
}

/**
 * Delete a department from Auth Center by code.
 */
export async function deleteAuthCenterDepartment(code: string, options?: AuthCenterClientAuthOptions): Promise<void> {
  const base = getBaseUrl();
  const appId = getAppId();

  const url = new URL(`${base}/api/auth/consumer/departments`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: await resolveAuthHeaders(options),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center delete department failed (${res.status}): ${text}`);
  }
}

export type AuthCenterEmailGroup = {
  id: string;
  entraGroupId: string | null;
  displayName: string;
  mail: string | null;
  description: string | null;
};

export async function searchAuthCenterEmailGroups(
  q: string,
  options?: AuthCenterClientAuthOptions
): Promise<AuthCenterEmailGroup[]> {
  const base = getBaseUrl();
  const appId = getAppId();

  const url = new URL(`${base}/api/auth/consumer/groups`);
  url.searchParams.set("appId", appId);
  if (q.trim()) url.searchParams.set("q", q.trim());

  const res = await fetch(url.toString(), {
    headers: await resolveAuthHeaders(options),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center groups search failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { data?: AuthCenterEmailGroup[] };
  return json.data ?? [];
}

