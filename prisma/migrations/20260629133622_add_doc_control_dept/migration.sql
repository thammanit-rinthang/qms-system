-- Migration: add_doc_control_dept
-- doc_control_depts table already exists (created by earlier db push attempt).
-- This script: seeds the table, remaps DocumentCategory.departmentId to UUID PKs, adds FK.

BEGIN;

-- Create table if not exists (for shadow database / clean setup support)
CREATE TABLE IF NOT EXISTS "doc_control_depts" (
  "id"             TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "auth_dept_code" TEXT,
  "email_group"    TEXT,
  "is_active"      BOOLEAN NOT NULL DEFAULT true,
  "sort_order"     INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "doc_control_depts_pkey" PRIMARY KEY ("id")
);

-- 1. Ensure unique index exists (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "doc_control_depts_auth_dept_code_key" ON "doc_control_depts"("auth_dept_code");

-- 2. Seed one row per distinct departmentId from DocumentCategory
INSERT INTO "doc_control_depts" ("id", "name", "auth_dept_code", "is_active", "sort_order", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  dc."departmentId",
  dc."departmentId",
  true,
  (ROW_NUMBER() OVER (ORDER BY dc."departmentId") - 1)::int,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "departmentId"
  FROM "DocumentCategory"
  WHERE "departmentId" IS NOT NULL AND "departmentId" != ''
) dc
ON CONFLICT ("auth_dept_code") DO NOTHING;

-- 3. Remap DocumentCategory.departmentId (currently Auth Center code) → DocControlDept UUID
--    Only if departmentId looks like a code (not already a UUID)
ALTER TABLE "DocumentCategory" ADD COLUMN IF NOT EXISTS "_new_dept_id" TEXT;

UPDATE "DocumentCategory" cat
SET "_new_dept_id" = dcd."id"
FROM "doc_control_depts" dcd
WHERE dcd."auth_dept_code" = cat."departmentId";

-- Drop old constraints/indexes before changing the column value
DROP INDEX IF EXISTS "DocumentCategory_departmentId_name_key";
DROP INDEX IF EXISTS "DocumentCategory_departmentId_idx";
ALTER TABLE "DocumentCategory" DROP CONSTRAINT IF EXISTS "DocumentCategory_departmentId_fkey";

-- Swap
UPDATE "DocumentCategory" SET "departmentId" = "_new_dept_id" WHERE "_new_dept_id" IS NOT NULL;
ALTER TABLE "DocumentCategory" DROP COLUMN "_new_dept_id";

-- Backfill snapshots
UPDATE "DocumentCategory" cat
SET "department_name" = dcd."name",
    "auth_department_id" = dcd."auth_dept_code"
FROM "doc_control_depts" dcd
WHERE dcd."id" = cat."departmentId"
  AND cat."department_name" IS NULL;

-- 4. Re-create indexes
CREATE INDEX IF NOT EXISTS "DocumentCategory_departmentId_idx" ON "DocumentCategory"("departmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentCategory_departmentId_name_key" ON "DocumentCategory"("departmentId", "name");

-- 5. Add FK
ALTER TABLE "DocumentCategory"
  ADD CONSTRAINT "DocumentCategory_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "doc_control_depts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
