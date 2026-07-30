import { db } from "@/lib/db";
import type { SignatureType, Prisma } from "@/generated/prisma/client";

export class UserPreferenceRepository {
  async findByAuthUserId(authUserId: string) {
    return db.userPreference.findUnique({
      where: { authUserId },
      select: { savedSignatureUrl: true, signatureType: true },
    });
  }

  async upsertSignature(
    authUserId: string,
    data: { savedSignatureUrl: string; signatureType: SignatureType },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? db;
    return client.userPreference.upsert({
      where: { authUserId },
      create: { authUserId, ...data },
      update: data,
    });
  }

  async clearSignature(authUserId: string) {
    return db.userPreference.upsert({
      where: { authUserId },
      create: { authUserId, savedSignatureUrl: null, signatureType: null },
      update: { savedSignatureUrl: null, signatureType: null },
    });
  }
}
