CREATE TABLE "DarRejectionHistory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "darMasterId" TEXT NOT NULL,
  "stepRole" "ApprovalStep" NOT NULL,
  "rejectedByUserId" TEXT NOT NULL,
  "rejected_by_auth_user_id" TEXT,
  "rejected_by_name" TEXT,
  "rejected_by_employee_id" TEXT,
  "rejected_by_department_name" TEXT,
  "comment" TEXT NOT NULL,
  "actionDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DarRejectionHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DarRejectionHistory_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DarRejectionHistory_darMasterId_idx" ON "DarRejectionHistory"("darMasterId");
CREATE INDEX "DarRejectionHistory_actionDate_idx" ON "DarRejectionHistory"("actionDate");
