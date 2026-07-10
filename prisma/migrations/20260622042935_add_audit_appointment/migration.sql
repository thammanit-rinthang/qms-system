-- CreateEnum
CREATE TYPE "AuditAppointmentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'PUBLISHED');

-- CreateTable
CREATE TABLE "audit_appointments" (
    "id" TEXT NOT NULL,
    "appointment_no" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "standards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AuditAppointmentStatus" NOT NULL DEFAULT 'DRAFT',
    "reject_reason" TEXT,
    "owner_auth_user_id" TEXT,
    "owner_email" TEXT,
    "owner_name_snapshot" TEXT,
    "reviewer_auth_user_id" TEXT,
    "reviewer_email" TEXT,
    "reviewer_name_snapshot" TEXT,
    "approver_auth_user_id" TEXT,
    "approver_email" TEXT,
    "approver_name_snapshot" TEXT,
    "email_group_mails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_appointment_members" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "role" TEXT NOT NULL,
    "standards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "audit_appointment_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_appointment_signoffs" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "signed_by_auth_user_id" TEXT NOT NULL,
    "signed_role" TEXT NOT NULL,
    "signer_name_snapshot" TEXT,
    "signature_path" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_appointment_signoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_appointments_appointment_no_key" ON "audit_appointments"("appointment_no");

-- CreateIndex
CREATE INDEX "audit_appointment_members_appointment_id_idx" ON "audit_appointment_members"("appointment_id");

-- AddForeignKey
ALTER TABLE "audit_appointment_members" ADD CONSTRAINT "audit_appointment_members_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "audit_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_appointment_signoffs" ADD CONSTRAINT "audit_appointment_signoffs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "audit_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
