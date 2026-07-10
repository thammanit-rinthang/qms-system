-- CreateEnum
CREATE TYPE "AuditScheduleConfirmStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "audit_schedules" ADD COLUMN     "confirm_status" "AuditScheduleConfirmStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_by_auth_user_id" TEXT,
ADD COLUMN     "confirmed_by_name" TEXT,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "department_name" TEXT,
ADD COLUMN     "unavailable_reason" TEXT;
