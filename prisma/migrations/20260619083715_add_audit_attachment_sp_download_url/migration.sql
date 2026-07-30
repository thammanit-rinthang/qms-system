/*
  Warnings:

  - You are about to drop the column `targetEmailGroup` on the `CarMaster` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AuditMode" AS ENUM ('SYSTEM', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "AuditPlanStatus" AS ENUM ('DRAFT', 'PLANNED', 'ANNOUNCED', 'IN_PROGRESS', 'WAITING_CORRECTIVE', 'READY_TO_CLOSE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditorRole" AS ENUM ('LEAD', 'MEMBER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('NC', 'OBSERVATION', 'OFI');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'RESPONDED', 'VERIFIED', 'CLOSED', 'REOPENED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditDeliveryMode" AS ENUM ('LINK', 'ATTACHMENT', 'BOTH');

-- CreateEnum
CREATE TYPE "AuditSignType" AS ENUM ('IN_APP', 'TOKEN_LINK');

-- CreateEnum
CREATE TYPE "AuditVerifyResult" AS ENUM ('PASS', 'FAIL', 'REOPEN');

-- AlterEnum
ALTER TYPE "ApprovalModule" ADD VALUE 'AUDIT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApprovalStep" ADD VALUE 'LEAD_AUDITOR';
ALTER TYPE "ApprovalStep" ADD VALUE 'AUDIT_SIGNER';

-- AlterTable
ALTER TABLE "CarMaster" DROP COLUMN "targetEmailGroup",
ADD COLUMN     "targetEmailGroups" TEXT[],
ADD COLUMN     "target_email_groups_cc" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "user_preferences" (
    "auth_user_id" TEXT NOT NULL,
    "saved_signature_url" TEXT,
    "signature_type" "SignatureType",
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("auth_user_id")
);

-- CreateTable
CREATE TABLE "audit_plans" (
    "id" TEXT NOT NULL,
    "audit_no" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audit_type" "AuditType" NOT NULL,
    "mode" "AuditMode" NOT NULL DEFAULT 'SYSTEM',
    "status" "AuditPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "standard" TEXT,
    "scope" TEXT,
    "objective" TEXT,
    "owner_auth_user_id" TEXT NOT NULL,
    "owner_name_snapshot" TEXT,
    "lead_auditor_auth_user_id" TEXT,
    "source_organization" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "calendar_event_id" TEXT,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_plan_departments" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "department_code" TEXT,
    "department_name" TEXT,

    CONSTRAINT "audit_plan_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_auditor_assignments" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "assignee_auth_user_id" TEXT NOT NULL,
    "assignee_name_snapshot" TEXT,
    "assignee_email_snapshot" TEXT,
    "role" "AuditorRole" NOT NULL DEFAULT 'MEMBER',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_auditor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_schedules" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "session_title" TEXT NOT NULL,
    "location" TEXT,
    "agenda" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "calendar_event_id" TEXT,

    CONSTRAINT "audit_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_attachments" (
    "id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT,
    "sp_download_url" TEXT,
    "sharepoint_item_id" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "uploaded_by_auth_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_announcements" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "delivery_mode" "AuditDeliveryMode" NOT NULL DEFAULT 'LINK',
    "published_at" TIMESTAMP(3),
    "published_by_auth_user_id" TEXT,

    CONSTRAINT "audit_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "finding_no" TEXT NOT NULL,
    "department_id" TEXT,
    "category" "FindingCategory" NOT NULL,
    "severity" "FindingSeverity" NOT NULL DEFAULT 'MINOR',
    "clause" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "evidence_summary" TEXT,
    "owner_auth_user_id" TEXT,
    "owner_name_snapshot" TEXT,
    "due_at" TIMESTAMP(3),
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "created_by_auth_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_corrective_actions" (
    "id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "root_cause" TEXT,
    "correction" TEXT,
    "corrective_action_plan" TEXT,
    "target_date" TIMESTAMP(3),
    "responded_by_auth_user_id" TEXT,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "audit_corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_verifications" (
    "id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "verifier_auth_user_id" TEXT NOT NULL,
    "result" "AuditVerifyResult" NOT NULL,
    "comment" TEXT,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_signoffs" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "signed_by_auth_user_id" TEXT NOT NULL,
    "signed_role" TEXT NOT NULL,
    "sign_type" "AuditSignType" NOT NULL DEFAULT 'IN_APP',
    "token_id" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_signoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_reports" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "summary" TEXT,
    "conclusion" TEXT,
    "pdf_file_url" TEXT,
    "generated_at" TIMESTAMP(3),
    "generated_by_auth_user_id" TEXT,

    CONSTRAINT "audit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_plans_audit_no_key" ON "audit_plans"("audit_no");

-- CreateIndex
CREATE INDEX "audit_plans_status_idx" ON "audit_plans"("status");

-- CreateIndex
CREATE INDEX "audit_plans_audit_type_idx" ON "audit_plans"("audit_type");

-- CreateIndex
CREATE INDEX "audit_plans_owner_auth_user_id_idx" ON "audit_plans"("owner_auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_plan_departments_plan_id_department_id_key" ON "audit_plan_departments"("plan_id", "department_id");

-- CreateIndex
CREATE INDEX "audit_auditor_assignments_plan_id_idx" ON "audit_auditor_assignments"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_auditor_assignments_plan_id_assignee_auth_user_id_key" ON "audit_auditor_assignments"("plan_id", "assignee_auth_user_id");

-- CreateIndex
CREATE INDEX "audit_schedules_plan_id_idx" ON "audit_schedules"("plan_id");

-- CreateIndex
CREATE INDEX "audit_attachments_resource_type_resource_id_idx" ON "audit_attachments"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_announcements_plan_id_idx" ON "audit_announcements"("plan_id");

-- CreateIndex
CREATE INDEX "audit_findings_plan_id_status_idx" ON "audit_findings"("plan_id", "status");

-- CreateIndex
CREATE INDEX "audit_findings_owner_auth_user_id_idx" ON "audit_findings"("owner_auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_findings_plan_id_finding_no_key" ON "audit_findings"("plan_id", "finding_no");

-- CreateIndex
CREATE UNIQUE INDEX "audit_corrective_actions_finding_id_key" ON "audit_corrective_actions"("finding_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_verifications_finding_id_key" ON "audit_verifications"("finding_id");

-- CreateIndex
CREATE INDEX "audit_signoffs_plan_id_idx" ON "audit_signoffs"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_reports_plan_id_key" ON "audit_reports"("plan_id");

-- AddForeignKey
ALTER TABLE "audit_plan_departments" ADD CONSTRAINT "audit_plan_departments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_auditor_assignments" ADD CONSTRAINT "audit_auditor_assignments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_schedules" ADD CONSTRAINT "audit_schedules_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_announcements" ADD CONSTRAINT "audit_announcements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_corrective_actions" ADD CONSTRAINT "audit_corrective_actions_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "audit_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_verifications" ADD CONSTRAINT "audit_verifications_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "audit_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_signoffs" ADD CONSTRAINT "audit_signoffs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
