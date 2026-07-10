/**
 * UserRepository stub — the local User table has been removed (Phase D).
 * Identity comes entirely from Auth Center.
 *
 * This file is kept as a stub so that callers not yet migrated (e.g. kpiService)
 * continue to compile. All methods return null / empty results.
 * Callers should be migrated to use Auth Center APIs or userSnapshotCache.
 */

import { BaseRepository } from "./baseRepository";
import type { SignatureType, Prisma } from "@/generated/prisma/client";
import type { AnyQmsRole } from "@/lib/qms-roles";

// Minimal shape that callers expect
type UserStub = {
  id: string;
  authUserId: string | null;
  employeeId: string | null;
  msUserId: string | null;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: string;
  position: string | null;
  savedSignatureUrl: string | null;
  signatureType: SignatureType | null;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  source: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type IdentitySnapshotStub = {
  id: string;
  authUserId: string | null;
  name: string | null;
  email: string | null;
  employeeId: string | null;
  position: string | null;
  departmentId: string | null;
  departmentName: string | null;
};

export class UserRepository extends BaseRepository<UserStub> {
  constructor() {
    // Pass a dummy model name — the model no longer exists
    super("userPreference" as never);
  }

  async findByEmail(_email: string, _tx?: Prisma.TransactionClient): Promise<UserStub | null> {
    return null;
  }

  async findByEmployeeId(_employeeId: string, _tx?: Prisma.TransactionClient): Promise<UserStub | null> {
    return null;
  }

  async findByAuthUserId(_authUserId: string, _tx?: Prisma.TransactionClient): Promise<UserStub | null> {
    return null;
  }

  async findIdentitySnapshotById(_id: string, _tx?: Prisma.TransactionClient): Promise<IdentitySnapshotStub | null> {
    return null;
  }

  async findIdentitySnapshotByAuthUserId(_authUserId: string, _tx?: Prisma.TransactionClient): Promise<IdentitySnapshotStub | null> {
    return null;
  }

  async upsertByAuthUserId(
    _authUserId: string,
    _data: { email: string; name?: string | null; employeeId?: string | null },
    _tx?: Prisma.TransactionClient,
  ): Promise<UserStub> {
    throw new Error("User table removed. Use Auth Center APIs.");
  }

  async findAssignees(_tx?: Prisma.TransactionClient) {
    return [];
  }

  async findFirstByRole(_role: AnyQmsRole, _tx?: Prisma.TransactionClient) {
    return null;
  }

  async findManyWithDept(_tx?: Prisma.TransactionClient) {
    return [];
  }

  async updateProfile(
    _id: string,
    _data: {
      name?: string;
      employeeId?: string | null;
      position?: string | null;
      savedSignatureUrl?: string | null;
      signatureType?: SignatureType | null;
    },
    _tx?: Prisma.TransactionClient
  ): Promise<UserStub> {
    throw new Error("User table removed. Use Auth Center APIs.");
  }

  async updateProfileByAuthUserId(
    _authUserId: string,
    _data: {
      name?: string;
      employeeId?: string | null;
      position?: string | null;
      savedSignatureUrl?: string | null;
      signatureType?: SignatureType | null;
    },
    _tx?: Prisma.TransactionClient
  ): Promise<UserStub> {
    throw new Error("User table removed. Use Auth Center APIs.");
  }

  async findByIds(
    _ids: string[],
    _select?: Record<string, boolean>,
    _tx?: Prisma.TransactionClient
  ): Promise<Array<{ id: string; name: string | null; email: string | null }>> {
    return [];
  }

  async findByRole(_role: AnyQmsRole, _tx?: Prisma.TransactionClient) {
    return [];
  }

  async findByDepartment(_departmentId: string, _tx?: Prisma.TransactionClient) {
    return [];
  }

  async updateRole(_id: string, _role: AnyQmsRole, _tx?: Prisma.TransactionClient): Promise<UserStub> {
    throw new Error("User table removed. Use Auth Center APIs.");
  }

  async saveSignature(
    _id: string,
    _data: { savedSignatureUrl: string; signatureType: SignatureType },
    _tx?: Prisma.TransactionClient
  ): Promise<UserStub> {
    throw new Error("User table removed. Use Auth Center APIs.");
  }

  async upsertUser(
    _email: string,
    _data: Record<string, unknown>,
    _tx?: Prisma.TransactionClient
  ): Promise<UserStub> {
    throw new Error("User table removed. Use Auth Center APIs.");
  }

  async findByMsUserIds(_msUserIds: string[], _tx?: Prisma.TransactionClient) {
    return [];
  }

  async findForM365Push(_id: string, _tx?: Prisma.TransactionClient) {
    return null;
  }

  async findAllForApprovalConfig(_tx?: Prisma.TransactionClient) {
    return [];
  }

  async countByIds(_ids: string[], _tx?: Prisma.TransactionClient): Promise<number> {
    return 0;
  }

  async updateAttributes(
    _id: string,
    _data: Record<string, unknown>,
    _tx?: Prisma.TransactionClient
  ): Promise<UserStub> {
    throw new Error("User table removed. Use Auth Center APIs.");
  }
}
