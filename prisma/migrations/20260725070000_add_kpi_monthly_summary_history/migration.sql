-- AlterTable
ALTER TABLE "kpi_monthly_summary_reviews" ADD COLUMN "cycle_no" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "kpi_monthly_summary_reviews" ADD COLUMN "prepare_by_name" TEXT;
ALTER TABLE "kpi_monthly_summary_reviews" ADD COLUMN "prepare_by_email" TEXT;

-- CreateTable
CREATE TABLE "kpi_monthly_summary_review_history" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "cycle_no" INTEGER NOT NULL,
    "status" "MonthlyStatus" NOT NULL,
    "prepare_by" TEXT,
    "reviewer_name" TEXT,
    "reviewer_email" TEXT,
    "approver_name" TEXT,
    "approver_email" TEXT,
    "submitted_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatures" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_monthly_summary_review_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_monthly_summary_review_history_year_idx" ON "kpi_monthly_summary_review_history"("year");
