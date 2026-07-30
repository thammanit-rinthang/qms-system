-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditPlanStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "AuditPlanStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "audit_plans" ADD COLUMN     "approver_auth_user_id" TEXT,
ADD COLUMN     "approver_email" TEXT,
ADD COLUMN     "approver_name_snapshot" TEXT,
ADD COLUMN     "email_group_mails" TEXT[],
ADD COLUMN     "reviewer_auth_user_id" TEXT,
ADD COLUMN     "reviewer_email" TEXT,
ADD COLUMN     "reviewer_name_snapshot" TEXT,
ADD COLUMN     "standards" TEXT[];

-- AlterTable
ALTER TABLE "audit_signoffs" ADD COLUMN     "signature_path" TEXT,
ADD COLUMN     "signer_name_snapshot" TEXT;

-- CreateTable
CREATE TABLE "audit_standards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_standards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_standards_name_key" ON "audit_standards"("name");
