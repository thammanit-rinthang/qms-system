/*
  Warnings:

  - You are about to drop the column `auditee_snapshot` on the `audit_session_rows` table. All the data in the column will be lost.
  - You are about to drop the column `auditor_team_snapshot` on the `audit_session_rows` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "audit_session_rows" DROP COLUMN "auditee_snapshot",
DROP COLUMN "auditor_team_snapshot";

-- CreateTable
CREATE TABLE "audit_session_team_members" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "auth_user_id" TEXT,

    CONSTRAINT "audit_session_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_session_team_members_session_id_idx" ON "audit_session_team_members"("session_id");

-- AddForeignKey
ALTER TABLE "audit_session_team_members" ADD CONSTRAINT "audit_session_team_members_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_session_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
