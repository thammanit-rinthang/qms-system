ALTER TYPE "AuditScheduleConfirmStatus" ADD VALUE IF NOT EXISTS 'SUGGESTED';

ALTER TABLE "audit_schedules"
  ADD COLUMN "suggested_start_at" TIMESTAMP(3),
  ADD COLUMN "suggested_end_at" TIMESTAMP(3),
  ADD COLUMN "suggested_reason" TEXT,
  ADD COLUMN "suggested_by_auth_user_id" TEXT,
  ADD COLUMN "suggested_by_name" TEXT,
  ADD COLUMN "suggested_at" TIMESTAMP(3);
