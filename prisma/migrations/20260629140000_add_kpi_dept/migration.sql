-- Migration: add_kpi_dept
-- Creates kpi_depts table and seeds it from distinct KPI.department values.
-- KPI.department remains a plain string (no FK migration needed).

CREATE TABLE "kpi_depts" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "auth_dept_code" TEXT,
  "email_group"  TEXT,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "sort_order"   INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kpi_depts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kpi_depts_name_key" ON "kpi_depts"("name");
CREATE UNIQUE INDEX "kpi_depts_auth_dept_code_key" ON "kpi_depts"("auth_dept_code");

-- Seed one row per distinct department value already in the kpis table
INSERT INTO "kpi_depts" ("id", "name", "is_active", "sort_order", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  k.department,
  true,
  (ROW_NUMBER() OVER (ORDER BY k.department) - 1)::int,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (SELECT DISTINCT department FROM "kpis" WHERE department IS NOT NULL AND department != '') k
ON CONFLICT ("name") DO NOTHING;
