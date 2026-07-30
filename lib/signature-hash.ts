import { createHash } from 'crypto';

export function createContentHash(payload: unknown): string {
  const canonical = JSON.stringify(payload);
  return createHash('sha256').update(canonical).digest('hex');
}
