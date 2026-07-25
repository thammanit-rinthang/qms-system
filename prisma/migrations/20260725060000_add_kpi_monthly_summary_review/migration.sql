-- AlterEnum
ALTER TYPE "ApprovalModule" ADD VALUE 'KPI_MONTHLY_SUMMARY';

-- CreateTable
CREATE TABLE "kpi_monthly_summary_reviews" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "MonthlyStatus" NOT NULL DEFAULT 'DRAFT',
    "prepare_by" TEXT,
    "reviewer_user_id" TEXT,
    "reviewer_auth_user_id" TEXT,
    "reviewer_name" TEXT,
    "reviewer_email" TEXT,
    "approver_user_id" TEXT,
    "approver_auth_user_id" TEXT,
    "approver_name" TEXT,
    "approver_email" TEXT,
    "email_group_mails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email_group_mails_cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_monthly_summary_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpi_monthly_summary_reviews_year_key" ON "kpi_monthly_summary_reviews"("year");

