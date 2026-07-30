-- CreateTable
CREATE TABLE "audit_session_plans" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "revise_no" INTEGER NOT NULL DEFAULT 0,
    "revise_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_session_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_session_rows" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "audit_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "auditor_team_snapshot" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auditee_snapshot" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remark" TEXT,

    CONSTRAINT "audit_session_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_gantt_rows" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "department" TEXT NOT NULL,
    "processes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "plan_weeks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actual_weeks" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "audit_gantt_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_session_plans_appointment_id_key" ON "audit_session_plans"("appointment_id");

-- CreateIndex
CREATE INDEX "audit_session_rows_plan_id_idx" ON "audit_session_rows"("plan_id");

-- CreateIndex
CREATE INDEX "audit_gantt_rows_plan_id_idx" ON "audit_gantt_rows"("plan_id");

-- AddForeignKey
ALTER TABLE "audit_session_plans" ADD CONSTRAINT "audit_session_plans_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "audit_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_session_rows" ADD CONSTRAINT "audit_session_rows_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_session_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_gantt_rows" ADD CONSTRAINT "audit_gantt_rows_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "audit_session_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
