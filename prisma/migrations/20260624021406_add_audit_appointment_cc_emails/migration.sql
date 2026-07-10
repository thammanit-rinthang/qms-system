-- CreateEnum
CREATE TYPE "AuditTeamRole" AS ENUM ('LEAD_AUDITOR', 'AUDITOR', 'OBSERVER', 'AUDITEE');

-- AlterTable
ALTER TABLE "audit_appointments" ADD COLUMN     "email_group_mails_cc" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "audit_plans" ADD COLUMN     "appointment_id" TEXT;

-- AlterTable
ALTER TABLE "audit_schedules" ADD COLUMN     "auditee_notify_dept" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "audit_schedule_team_members" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "name_snapshot" TEXT,
    "email_snapshot" TEXT,
    "role" "AuditTeamRole" NOT NULL,

    CONSTRAINT "audit_schedule_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_schedule_team_members_schedule_id_idx" ON "audit_schedule_team_members"("schedule_id");

-- AddForeignKey
ALTER TABLE "audit_schedule_team_members" ADD CONSTRAINT "audit_schedule_team_members_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "audit_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
