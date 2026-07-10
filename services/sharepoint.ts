/**
 * Microsoft Graph API — SharePoint / OneDrive operations (app-only)
 *
 * Required Azure AD application permissions:
 *   - Sites.ReadWrite.All  (read/write files in SharePoint)
 *
 * Environment variables:
 *   AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
 *   SHAREPOINT_SITE_ID   — Site.id from Graph (fe866e36-...)
 *   SHAREPOINT_DRIVE_ID  — optional; if unset, uses the site's default drive
 */

import type { DarObjective, DarDocType } from "@/types/dar";
import { getGraphToken } from "@/lib/graph-token";
import { graphFetch } from "@/lib/graphFetch";

// ── Token + driveId + 401 retry helper ───────────────────────────────────────

// ponytail: retries once on 401 by busting token + driveId caches; needed
// because Auth Center can issue tokens shorter than our 55-min Redis TTL.
async function withGraph<T>(fn: (token: string, driveId: string) => Promise<T>): Promise<T> {
  const run = async () => {
    const [token, driveId] = await Promise.all([getGraphToken(), getDriveId()]);
    return fn(token, driveId);
  };
  try {
    return await run();
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("401")) throw err;
    _driveId = null;
    await getGraphToken({ forceRefresh: true });
    return run();
  }
}

// ── Drive resolution ──────────────────────────────────────────────────────────

let _driveId: string | null = null;

async function getDriveId(): Promise<string> {
  if (_driveId) return _driveId;

  if (process.env.SHAREPOINT_DRIVE_ID) {
    _driveId = process.env.SHAREPOINT_DRIVE_ID;
    return _driveId;
  }

  // Fall back to site's default document library drive
  const siteId = process.env.SHAREPOINT_SITE_ID;
  const token = await getGraphToken();
  const res = await graphFetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Graph GET site drive ${res.status}: ${t}`);
  }
  const json = await res.json() as { id: string };
  _driveId = json.id;
  return _driveId;
}

// ── Folder path builder ───────────────────────────────────────────────────────

const OBJECTIVE_FOLDER: Record<DarObjective, string> = {
  PREPARE_NEW: "จัดทำใหม่",
  REQUEST_COPY_CONTROLLED: "สำเนาควบคุม",
  REQUEST_COPY_UNCONTROLLED: "สำเนาไม่ควบคุม",
  REVISE: "แก้ไข",
  CANCEL: "ยกเลิก",
};

const DOCTYPE_FOLDER: Record<DarDocType, string> = {
  MANUAL: "Manual",
  FORMAT: "Format",
  DRAWING: "Drawing",
  PROCEDURE: "Procedure",
  SOP: "SOP",
  SIP: "SIP",
  IPQC: "IPQC",
  OTHER: "Other",
};

export function buildFolderPath(opts: {
  departmentName: string;
  objective: DarObjective;
  docType: DarDocType;
}): string {
  const dept = opts.departmentName.replace(/[/\\:*?"<>|]/g, "_").trim();
  const obj = OBJECTIVE_FOLDER[opts.objective];
  const doc = DOCTYPE_FOLDER[opts.docType];
  return `DAR/${dept}/${obj}/${doc}`;
}

// ── Ensure folder exists using path-based API ────────────────────────────────
// SharePoint does not support $filter on children; use the :/path: endpoint instead.

async function ensureFolderPath(driveId: string, token: string, folderPath: string): Promise<string> {
  // Try to GET the folder by path first — fastest path when it already exists
  const encodedPath = folderPath.split("/").map(encodeURIComponent).join("/");
  const getUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}`;

  const getRes = await graphFetch(`${getUrl}?$select=id`, { headers: { Authorization: `Bearer ${token}` } });
  if (getRes.ok) {
    const item = await getRes.json() as { id: string };
    return item.id;
  }
  if (getRes.status !== 404) {
    const t = await getRes.text();
    throw new Error(`Graph GET folder ${getRes.status}: ${t}`);
  }

  // Folder doesn't exist — create each segment in sequence
  const segments = folderPath.split("/").filter(Boolean);
  let parentId = "root";

  for (const segment of segments) {
    // Try GET by accumulated path to avoid unnecessary creates
    const accPath = segments.slice(0, segments.indexOf(segment) + 1).join("/");
    const encodedAcc = accPath.split("/").map(encodeURIComponent).join("/");
    const stepGet = await graphFetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedAcc}?$select=id`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (stepGet.ok) {
      const item = await stepGet.json() as { id: string };
      parentId = item.id;
      continue;
    }

    // Create the segment under current parent
    const createRes = await graphFetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: segment,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }),
      },
    );
    if (!createRes.ok) {
      // ponytail: 409 = folder already exists (concurrent upload race) — GET it instead
      if (createRes.status === 409) {
        const encodedAcc = segments.slice(0, segments.indexOf(segment) + 1).join("/").split("/").map(encodeURIComponent).join("/");
        const retryGet = await graphFetch(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedAcc}?$select=id`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (retryGet.ok) {
          const item = await retryGet.json() as { id: string };
          parentId = item.id;
          continue;
        }
      }
      const t = await createRes.text();
      throw new Error(`Graph create folder "${segment}" ${createRes.status}: ${t}`);
    }
    const created = await createRes.json() as { id: string };
    parentId = created.id;
  }

  return parentId;
}

// ── Upload file ───────────────────────────────────────────────────────────────

export interface SpUploadResult {
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  driveId: string;
  folderPath: string;
}

export async function uploadFileToDar(opts: {
  fileBuffer: Uint8Array;
  fileName: string;
  mimeType: string;
  darNo: string;
  departmentName: string;
  objective: DarObjective;
  docType: DarDocType;
}): Promise<SpUploadResult> {
  return withGraph(async (token, driveId) => {
    const folderPath = buildFolderPath({
      departmentName: opts.departmentName,
      objective: opts.objective,
      docType: opts.docType,
    });
    const folderId = await ensureFolderPath(driveId, token, folderPath);
    const safeBase = opts.fileName.replace(/[/\\:*?"<>|]/g, "_");
    const uploadName = `${opts.darNo}_${safeBase}`;
    if (opts.fileBuffer.length <= 4 * 1024 * 1024) {
      return simpleUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
    }
    return resumableUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
  });
}

interface UploadOpts {
  token: string;
  driveId: string;
  folderId: string;
  uploadName: string;
  fileBuffer: Uint8Array;
  mimeType: string;
  folderPath: string;
}

interface SpItem {
  id: string;
  webUrl: string;
  "@microsoft.graph.downloadUrl"?: string;
}

async function simpleUpload(opts: UploadOpts): Promise<SpUploadResult> {
  const url = `https://graph.microsoft.com/v1.0/drives/${opts.driveId}/items/${opts.folderId}:/${encodeURIComponent(opts.uploadName)}:/content?@microsoft.graph.conflictBehavior=rename`;
  const res = await graphFetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": opts.mimeType,
    },
    body: opts.fileBuffer as unknown as BodyInit,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Graph upload ${res.status}: ${t}`);
  }
  const item = await res.json() as SpItem;
  return {
    spItemId: item.id,
    spWebUrl: item.webUrl,
    spDownloadUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
    driveId: opts.driveId,
    folderPath: opts.folderPath,
  };
}

async function resumableUpload(opts: UploadOpts): Promise<SpUploadResult> {
  // Create upload session
  const sessionUrl = `https://graph.microsoft.com/v1.0/drives/${opts.driveId}/items/${opts.folderId}:/${encodeURIComponent(opts.uploadName)}:/createUploadSession`;
  const sessionRes = await graphFetch(sessionUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }),
  });
  if (!sessionRes.ok) {
    const t = await sessionRes.text();
    throw new Error(`Graph createUploadSession ${sessionRes.status}: ${t}`);
  }
  const { uploadUrl } = await sessionRes.json() as { uploadUrl: string };

  // Upload in 5 MB chunks
  const chunkSize = 5 * 1024 * 1024;
  const total = opts.fileBuffer.length;
  let offset = 0;
  let item: SpItem | null = null;

  while (offset < total) {
    const end = Math.min(offset + chunkSize, total);
    const chunk = opts.fileBuffer.subarray(offset, end);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${offset}-${end - 1}/${total}`,
        "Content-Type": opts.mimeType,
      },
      body: chunk as unknown as BodyInit,
    });
    if (uploadRes.status === 201 || uploadRes.status === 200) {
      item = await uploadRes.json() as SpItem;
    } else if (uploadRes.status === 202) {
      // chunk accepted, continue
    } else {
      const t = await uploadRes.text();
      throw new Error(`Graph resumable chunk ${uploadRes.status}: ${t}`);
    }
    offset = end;
  }

  if (!item) throw new Error("Resumable upload finished but no item returned");
  return {
    spItemId: item.id,
    spWebUrl: item.webUrl,
    spDownloadUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
    driveId: opts.driveId,
    folderPath: opts.folderPath,
  };
}

// ── CAR attachment upload ─────────────────────────────────────────────────────

export async function uploadFileToCarResponse(opts: {
  fileBuffer: Uint8Array;
  fileName: string;
  mimeType: string;
  carNo: string;
}): Promise<SpUploadResult> {
  return withGraph(async (token, driveId) => {
    const folderPath = `CAR/${opts.carNo.replace(/[/\\:*?"<>|]/g, "_")}`;
    const folderId = await ensureFolderPath(driveId, token, folderPath);
    const safeBase = opts.fileName.replace(/[/\\:*?"<>|]/g, "_");
    const uploadName = `${opts.carNo}_${safeBase}`;
    if (opts.fileBuffer.length <= 4 * 1024 * 1024) {
      return simpleUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
    }
    return resumableUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
  });
}

// ── Temp upload (before DAR exists) ──────────────────────────────────────────

export interface TempUploadResult {
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  folderPath: string;
  driveId: string;
}

export async function uploadFileToTemp(opts: {
  fileBuffer: Uint8Array;
  fileName: string;
  mimeType: string;
  tempId: string; // uuid generated client-side per form session
}): Promise<TempUploadResult> {
  return withGraph(async (token, driveId) => {
    const folderPath = `DAR/_temp/${opts.tempId}`;
    const folderId = await ensureFolderPath(driveId, token, folderPath);
    const safeBase = opts.fileName.replace(/[/\\:*?"<>|]/g, "_");
    const result = opts.fileBuffer.length <= 4 * 1024 * 1024
      ? await simpleUpload({ token, driveId, folderId, uploadName: safeBase, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath })
      : await resumableUpload({ token, driveId, folderId, uploadName: safeBase, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
    return { spItemId: result.spItemId, spWebUrl: result.spWebUrl, spDownloadUrl: result.spDownloadUrl, folderPath, driveId };
  });
}

// Move a SharePoint item into a target folder (by folder item id).
// Returns updated webUrl and downloadUrl.
export async function moveSpItem(opts: {
  spItemId: string;
  targetFolderPath: string;
  newName: string;
}): Promise<{ spWebUrl: string; spDownloadUrl: string }> {
  return withGraph(async (token, driveId) => {
    const targetFolderId = await ensureFolderPath(driveId, token, opts.targetFolderPath);
    const res = await graphFetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${opts.spItemId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: opts.newName,
        parentReference: { id: targetFolderId },
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Graph PATCH (move) item ${res.status}: ${t}`);
    }
    const item = await res.json() as { webUrl: string; "@microsoft.graph.downloadUrl"?: string };
    return {
      spWebUrl: item.webUrl,
      spDownloadUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
    };
  });
}

// Rename an existing SharePoint item in place.
export async function renameSpItem(opts: {
  spItemId: string;
  newName: string;
}): Promise<{ name: string; spWebUrl: string; spDownloadUrl: string }> {
  return withGraph(async (token, driveId) => {
    const res = await graphFetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${opts.spItemId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: opts.newName,
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Graph PATCH (rename) item ${res.status}: ${t}`);
    }
    const item = await res.json() as { name: string; webUrl: string; "@microsoft.graph.downloadUrl"?: string };
    return {
      name: item.name,
      spWebUrl: item.webUrl,
      spDownloadUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
    };
  });
}

// Delete temp folder entirely (best-effort)
export async function deleteTempFolder(tempId: string): Promise<void> {
  return withGraph(async (token, driveId) => {
    const folderPath = `DAR/_temp/${tempId}`;
    const encodedPath = folderPath.split("/").map(encodeURIComponent).join("/");
    const getRes = await graphFetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}?$select=id`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!getRes.ok) return; // already gone or never existed
    const { id } = await getRes.json() as { id: string };
    await graphFetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  });
}

// ── Delete file ───────────────────────────────────────────────────────────────

export async function deleteSpItem(spItemId: string): Promise<void> {
  return withGraph(async (token, driveId) => {
    const res = await graphFetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${spItemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    // 204 = success, 404 = already gone — both are fine
    if (!res.ok && res.status !== 404) {
      const t = await res.text();
      throw new Error(`Graph DELETE item ${res.status}: ${t}`);
    }
  });
}

// ── Document Control Upload ───────────────────────────────────────────────────

export async function uploadFileToDocControl(opts: {
  fileBuffer: Uint8Array;
  fileName: string;
  mimeType: string;
  deptName: string;
  categoryName: string;
  docNumber: string;
  revision?: string;
}): Promise<SpUploadResult> {
  return withGraph(async (token, driveId) => {
    const folderPath = buildDocControlDocumentFolderPath(opts.deptName, opts.categoryName, opts.docNumber, opts.revision);
    const folderId = await ensureFolderPath(driveId, token, folderPath);
    const safeBase = opts.fileName.replace(/[/\\:*?"<>|]/g, "_");
    const uploadName = `${opts.docNumber}_${safeBase}`;
    if (opts.fileBuffer.length <= 4 * 1024 * 1024) {
      return simpleUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
    }
    return resumableUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
  });
}

export async function uploadFileToKpiMonthly(opts: {
  fileBuffer: Uint8Array;
  fileName: string;
  mimeType: string;
  departmentName: string;
  year: number;
  month: string;
}): Promise<SpUploadResult> {
  return withGraph(async (token, driveId) => {
    const folderPath = `KPI Monthly/${sanitizeFolderSegment(opts.departmentName)}/${opts.year}/${sanitizeFolderSegment(opts.month)}`;
    const folderId = await ensureFolderPath(driveId, token, folderPath);
    const safeBase = opts.fileName.replace(/[/\\:*?"<>|]/g, "_");
    const uploadName = `${opts.year}_${opts.month}_${safeBase}`;
    if (opts.fileBuffer.length <= 4 * 1024 * 1024) {
      return simpleUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
    }
    return resumableUpload({ token, driveId, folderId, uploadName, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
  });
}

function sanitizeFolderSegment(input: string): string {
  return input.replace(/[/\\:*?"<>|]/g, "_").trim() || "Unknown";
}

export function buildDocControlCategoryFolderPath(deptName: string, categoryName: string): string {
  return `DocumentControls/${sanitizeFolderSegment(deptName)}/${sanitizeFolderSegment(categoryName)}`;
}

export function buildDocControlDocumentFolderPath(
  deptName: string,
  categoryName: string,
  docNumber: string,
  revision?: string,
): string {
  const base = `${buildDocControlCategoryFolderPath(deptName, categoryName)}/${sanitizeFolderSegment(docNumber)}`;
  return revision ? `${base}/REV_${sanitizeFolderSegment(revision)}` : base;
}

// ── Audit Plan Upload ─────────────────────────────────────────────────────────

export async function uploadFileToAudit(opts: {
  fileBuffer: Uint8Array;
  fileName: string;
  mimeType: string;
  planId: string;
}): Promise<SpUploadResult> {
  return withGraph(async (token, driveId) => {
    const safeBase = opts.fileName.replace(/[/\\:*?"<>|]/g, "_");
    const safePlanId = opts.planId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const folderPath = `Audit/${safePlanId}`;
    const folderId = await ensureFolderPath(driveId, token, folderPath);
    if (opts.fileBuffer.length <= 4 * 1024 * 1024) {
      return simpleUpload({ token, driveId, folderId, uploadName: safeBase, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
    }
    return resumableUpload({ token, driveId, folderId, uploadName: safeBase, fileBuffer: opts.fileBuffer, mimeType: opts.mimeType, folderPath });
  });
}

export async function ensureSpFolder(folderPath: string): Promise<void> {
  return withGraph((token, driveId) => ensureFolderPath(driveId, token, folderPath).then(() => undefined));
}

export async function moveSpFolderByPath(opts: {
  sourceFolderPath: string;
  targetParentPath: string;
  newFolderName?: string;
}): Promise<{ movedFolderPath: string }> {
  return withGraph(async (token, driveId) => {
    const sourceEncoded = opts.sourceFolderPath.split("/").map(encodeURIComponent).join("/");
    const sourceRes = await graphFetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${sourceEncoded}?$select=id,name`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!sourceRes.ok) {
      const t = await sourceRes.text();
      throw new Error(`Graph GET source folder ${sourceRes.status}: ${t}`);
    }
    const source = await sourceRes.json() as { id: string; name: string };
    const targetParentId = await ensureFolderPath(driveId, token, opts.targetParentPath);
    const newName = opts.newFolderName ?? source.name;
    const patchRes = await graphFetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${source.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        parentReference: { id: targetParentId },
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    });
    if (!patchRes.ok) {
      const t = await patchRes.text();
      throw new Error(`Graph PATCH (move folder) ${patchRes.status}: ${t}`);
    }
    return { movedFolderPath: `${opts.targetParentPath}/${newName}` };
  });
}

export async function deleteSpFolderByPath(folderPath: string): Promise<void> {
  return withGraph(async (token, driveId) => {
    const encodedPath = folderPath.split("/").map(encodeURIComponent).join("/");
    const getRes = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}?$select=id`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!getRes.ok) {
      if (getRes.status === 404) return;
      const t = await getRes.text();
      throw new Error(`Graph GET folder before delete ${getRes.status}: ${t}`);
    }
    const { id } = await getRes.json() as { id: string };
    const delRes = await graphFetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!delRes.ok && delRes.status !== 404) {
      const t = await delRes.text();
      throw new Error(`Graph DELETE folder ${delRes.status}: ${t}`);
    }
  });
}
