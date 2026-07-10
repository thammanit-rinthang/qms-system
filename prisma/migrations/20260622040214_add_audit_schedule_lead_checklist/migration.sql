-- AlterTable
ALTER TABLE "audit_schedules" ADD COLUMN     "checklist_due_at" TIMESTAMP(3),
ADD COLUMN     "checklist_submitted_at" TIMESTAMP(3),
ADD COLUMN     "checklist_submitted_by_name" TEXT,
ADD COLUMN     "checklist_submitted_by_user_id" TEXT,
ADD COLUMN     "lead_auditor_auth_user_id" TEXT,
ADD COLUMN     "lead_auditor_email_snapshot" TEXT,
ADD COLUMN     "lead_auditor_name_snapshot" TEXT;
