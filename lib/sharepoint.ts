/**
 * Microsoft Graph API — SharePoint helpers (Edge-Runtime compatible)
 *
 * Uses raw fetch — no Node.js built-ins, no SDK dependencies.
 * Token is proxied through Auth Center (no Azure AD credentials in this app).
 * Required Azure AD app permissions (on Auth Center's app registration):
 *   - Sites.ReadWrite.All
 *
 * Environment variables:
 *   SHAREPOINT_SITE_ID  — optional; defaults to "root" (tenant root site)
 */

import { getGraphToken } from "@/lib/graph-token";

// ponytail: defaults to "root" so SHAREPOINT_SITE_ID is optional
const SITE_ID = () => process.env.SHAREPOINT_SITE_ID || "root";

async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await getGraphToken();
  try {
    return await fn(token);
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("401")) throw err;
    const fresh = await getGraphToken({ forceRefresh: true });
    return fn(fresh);
  }
}

export type SpFile = {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  parentReference?: { path: string };
};

export async function createFolder(folderName: string, parentPath = "root"): Promise<SpFile> {
  return withToken(async (token) => {
    const siteId = SITE_ID();
    const endpoint = parentPath === "root"
      ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
      : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(parentPath)}:/children`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "rename" }),
    });
    if (!res.ok) { const text = await res.text(); throw new Error(`Graph createFolder ${res.status}: ${text}`); }
    return res.json() as Promise<SpFile>;
  });
}

export async function uploadFile(fileName: string, fileBuffer: Uint8Array, folderPath = "root"): Promise<SpFile> {
  return withToken(async (token) => {
    const siteId = SITE_ID();
    const endpoint = folderPath === "root"
      ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(fileName)}:/content`
      : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(folderPath)}/${encodeURIComponent(fileName)}:/content`;
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body: fileBuffer.buffer as ArrayBuffer,
    });
    if (!res.ok) { const text = await res.text(); throw new Error(`Graph uploadFile ${res.status}: ${text}`); }
    return res.json() as Promise<SpFile>;
  });
}

export async function listFiles(folderPath = "root"): Promise<SpFile[]> {
  return withToken(async (token) => {
    const siteId = SITE_ID();
    const endpoint = folderPath === "root"
      ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
      : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(folderPath)}:/children`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { const text = await res.text(); throw new Error(`Graph listFiles ${res.status}: ${text}`); }
    const data = await res.json() as { value: SpFile[] };
    return data.value ?? [];
  });
}

export type FileInfo = {
  downloadUrl: string;
  webUrl: string;
  name: string;
  mimeType: string;
};

// @microsoft.graph.downloadUrl is an OData annotation — Graph omits it when
// $select is present (even if listed). Fetch without $select to get all fields.
export async function getFileInfo(itemId: string): Promise<FileInfo> {
  return withToken(async (token) => {
    const siteId = SITE_ID();
    const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { const text = await res.text(); throw new Error(`Graph API error ${res.status}: ${text}`); }
    const item = await res.json() as {
      "@microsoft.graph.downloadUrl"?: string;
      webUrl: string;
      name: string;
      file?: { mimeType: string };
    };
    return {
      downloadUrl: item["@microsoft.graph.downloadUrl"] ?? "",
      webUrl: item.webUrl,
      name: item.name,
      mimeType: item.file?.mimeType ?? "",
    };
  });
}

export async function getFileStream(
  itemId: string
): Promise<{ stream: ReadableStream; contentType: string; name: string }> {
  const info = await getFileInfo(itemId);
  if (!info.downloadUrl) throw new Error("No download URL returned from Graph API");
  const res = await fetch(info.downloadUrl);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  if (!res.body) throw new Error("Response body is null");
  return {
    stream: res.body,
    contentType: res.headers.get("content-type") ?? info.mimeType,
    name: info.name,
  };
}

export async function deleteItem(itemId: string): Promise<void> {
  await withToken(async (token) => {
    const siteId = SITE_ID();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    // 204 = success, 404 = already gone — both are acceptable
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Graph deleteItem ${res.status}: ${text}`);
    }
  });
}

// Returns a short-lived embed URL for Office files via the Graph /preview endpoint.
export async function getOfficePreviewUrl(itemId: string): Promise<string> {
  return withToken(async (token) => {
    const siteId = SITE_ID();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/preview`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    if (!res.ok) { const text = await res.text(); throw new Error(`Graph preview ${res.status}: ${text}`); }
    const data = await res.json() as { getUrl: string };
    return data.getUrl;
  });
}
