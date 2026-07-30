export const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function hasValidMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  const b = buffer;
  switch (mimeType) {
    case "application/pdf":
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    case "image/png":
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/gif":
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
    case "image/webp":
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
             b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return b[0] === 0x50 && b[1] === 0x4b;
    case "application/msword":
    case "application/vnd.ms-excel":
      return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
    default:
      return false;
  }
}
