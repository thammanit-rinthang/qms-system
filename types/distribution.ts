export const STAMP_IMAGE_KEYS = [
  "1.Controlled.png",
  "2.Obsoleted.png",
  "3.Top secret.png",
  "4.Drawing.webp",
] as const;
export type StampImageKey = (typeof STAMP_IMAGE_KEYS)[number];

export function isStampImageKey(value: string): value is StampImageKey {
  return (STAMP_IMAGE_KEYS as readonly string[]).includes(value);
}

export function stampUsesDate(key: string) {
  return key === "1.Controlled.png" || key === "2.Obsoleted.png" || key === "1.Controlled.webp";
}

export function stampUsesDepartment(key: string) {
  return key === "1.Controlled.png" || key === "1.Controlled.webp";
}

// Percent-of-page box, resolution-independent — {0,0} is the page's top-left.
export type PctBox = { xPct: number; yPct: number; wPct?: number; fontSize?: number };
export type PagePctBoxes = PctBox | PctBox[];

export type DocumentDistributionTargetRow = {
  id: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  downloadedAt: string | null;
  downloadedByName: string | null;
};

export type DocumentDistributionRow = {
  id: string;
  darMasterId: string;
  revisionId: string;
  stampImageKey: string;
  status: string;
  linkToDocumentControl: boolean;
  publishedByName: string | null;
  publishedAt: string;
  targets: DocumentDistributionTargetRow[];
};
