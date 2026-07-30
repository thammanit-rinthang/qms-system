-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'IT', 'QMS', 'MR');

-- CreateEnum
CREATE TYPE "DisplayType" AS ENUM ('LIST', 'SCROLLING', 'BANNER');

-- CreateEnum
CREATE TYPE "DarStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVE', 'QMS_PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStep" AS ENUM ('REQUESTER', 'REQUESTER_MANAGER', 'PREPARER', 'REVIEWER', 'APPROVER', 'APPROVER_MR', 'APPROVER_DCC', 'QMS_PROCESSOR');

-- CreateEnum
CREATE TYPE "ApprovalModule" AS ENUM ('DAR', 'KPI', 'KPI_MONTHLY', 'CAR');

-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('DRAFT', 'ISSUED', 'RESPONDED', 'VERIFY_1', 'VERIFY_2', 'CLOSED', 'RE_CAR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CarSourceType" AS ENUM ('I', 'C', 'N', 'O');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('DRAW', 'TYPE', 'IMAGE');

-- CreateEnum
CREATE TYPE "KpiObjectiveStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MonthlyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AchievedStatus" AS ENUM ('PENDING', 'OK', 'NOT_OK');

-- CreateEnum
CREATE TYPE "DocControlStatus" AS ENUM ('DRAFT', 'ACTIVE', 'OBSOLETE');

-- CreateTable
CREATE TABLE "SystemConfig" (
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("configKey")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "displayType" "DisplayType" NOT NULL DEFAULT 'LIST',
    "pushToCompanyCenter" BOOLEAN NOT NULL DEFAULT false,
    "expiryDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "spDownloadUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "bgColor" TEXT,
    "bgImageUrl" TEXT,
    "bgImageSpId" TEXT,
    "textColor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "created_by_auth_user_id" TEXT,
    "created_by_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarMaster" (
    "id" TEXT NOT NULL,
    "darNo" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objective" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docTypeOther" TEXT,
    "reason" TEXT NOT NULL,
    "spFolderId" TEXT,
    "spFolderPath" TEXT,
    "spDriveId" TEXT,
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "status" "DarStatus" NOT NULL DEFAULT 'DRAFT',
    "requesterId" TEXT NOT NULL,
    "requester_auth_user_id" TEXT,
    "requester_name" TEXT,
    "requester_employee_id" TEXT,
    "requester_email" TEXT,
    "requester_department_name" TEXT,
    "departmentId" TEXT NOT NULL,
    "auth_department_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DarMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarItem" (
    "id" TEXT NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "docNumber" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "darMasterId" TEXT NOT NULL,

    CONSTRAINT "DarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarDistribution" (
    "id" TEXT NOT NULL,
    "darMasterId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "auth_department_id" TEXT,
    "department_name" TEXT,

    CONSTRAINT "DarDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarAttachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "spItemId" TEXT NOT NULL,
    "spWebUrl" TEXT NOT NULL,
    "spDownloadUrl" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "darMasterId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploaded_by_auth_user_id" TEXT,
    "uploaded_by_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DarAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarApproval" (
    "id" TEXT NOT NULL,
    "stepRole" "ApprovalStep" NOT NULL,
    "action" "ApprovalAction" NOT NULL DEFAULT 'PENDING',
    "actionDate" TIMESTAMP(3),
    "signatureUsedUrl" TEXT,
    "signatureTypeUsed" "SignatureType",
    "darMasterId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "assigned_auth_user_id" TEXT,
    "assigned_user_name" TEXT,
    "assigned_employee_id" TEXT,
    "assigned_department_name" TEXT,
    "comment" TEXT,

    CONSTRAINT "DarApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalSignature" (
    "id" TEXT NOT NULL,
    "module" "ApprovalModule" NOT NULL,
    "documentId" TEXT NOT NULL,
    "step" "ApprovalStep" NOT NULL,
    "action" "ApprovalAction" NOT NULL DEFAULT 'PENDING',
    "actionDate" TIMESTAMP(3),
    "signerUserId" TEXT NOT NULL,
    "signer_auth_user_id" TEXT,
    "signer_name" TEXT,
    "signer_email" TEXT,
    "signer_department_name" TEXT,
    "signaturePath" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QmsProcessing" (
    "id" TEXT NOT NULL,
    "chkHasAttachment" BOOLEAN NOT NULL DEFAULT false,
    "chkPrintAndValidate" BOOLEAN NOT NULL DEFAULT false,
    "chkRenumber" BOOLEAN NOT NULL DEFAULT false,
    "chkImpactInvestigated" BOOLEAN NOT NULL DEFAULT false,
    "chkSubmitVerification" BOOLEAN NOT NULL DEFAULT false,
    "chkGetBackProcess" BOOLEAN NOT NULL DEFAULT false,
    "chkCopyDistribute" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "processDate" TIMESTAMP(3),
    "darMasterId" TEXT NOT NULL,
    "qmsUserId" TEXT NOT NULL,
    "qms_auth_user_id" TEXT,
    "qms_user_name" TEXT,
    "qms_user_employee_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QmsProcessing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicDocument" (
    "id" TEXT NOT NULL,
    "darMasterId" TEXT,
    "docNumber" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "spDriveId" TEXT NOT NULL,
    "spItemId" TEXT NOT NULL,
    "spFolderPath" TEXT,
    "spWebUrl" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "yearly" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "prepare" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "approver" TEXT NOT NULL,
    "status" "KpiObjectiveStatus" NOT NULL DEFAULT 'DRAFT',
    "prepare_signature" TEXT,
    "reviewer_user_id" TEXT,
    "reviewer_auth_user_id" TEXT,
    "reviewer_email" TEXT,
    "approver_user_id" TEXT,
    "approver_auth_user_id" TEXT,
    "approver_email" TEXT,
    "submitted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_objectives" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "objective" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "calculation_formula" TEXT NOT NULL,
    "action_plan_guidelines" TEXT NOT NULL,
    "reference_documents" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_monthly_reports" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "MonthlyStatus" NOT NULL DEFAULT 'DRAFT',
    "prepare_by" TEXT,
    "review_by" TEXT,
    "approve_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "remark" TEXT,
    "attachment_file_name" TEXT,
    "attachment_file_size" INTEGER,
    "attachment_mime_type" TEXT,
    "attachment_sp_item_id" TEXT,
    "attachment_web_url" TEXT,
    "attachment_download_url" TEXT,
    "attachment_uploaded_at" TIMESTAMP(3),
    "attachment_uploaded_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_monthly_details" (
    "id" TEXT NOT NULL,
    "monthly_report_id" TEXT NOT NULL,
    "kpi_objective_id" TEXT NOT NULL,
    "actual_result" DOUBLE PRECISION,
    "achievedStatus" "AchievedStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_monthly_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_corrective_actions" (
    "id" TEXT NOT NULL,
    "monthly_detail_id" TEXT NOT NULL,
    "times" INTEGER NOT NULL,
    "root_cause" TEXT NOT NULL,
    "guidelines" TEXT NOT NULL,
    "responsible_person" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentControl" (
    "id" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "revision" TEXT,
    "description" TEXT,
    "status" "DocControlStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3),
    "spDriveId" TEXT,
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "spDownloadUrl" TEXT,
    "spFolderPath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdById" TEXT NOT NULL,
    "created_by_auth_user_id" TEXT,
    "created_by_name" TEXT,
    "updatedById" TEXT,
    "updated_by_auth_user_id" TEXT,
    "updated_by_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "auth_department_id" TEXT,
    "department_name" TEXT,
    "categoryId" TEXT,

    CONSTRAINT "DocumentControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "departmentId" TEXT NOT NULL,
    "auth_department_id" TEXT,
    "department_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentControlRevision" (
    "id" TEXT NOT NULL,
    "documentControlId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "status" "DocControlStatus" NOT NULL DEFAULT 'ACTIVE',
    "spDriveId" TEXT,
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "spDownloadUrl" TEXT,
    "spFolderPath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdById" TEXT NOT NULL,
    "created_by_auth_user_id" TEXT,
    "created_by_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentControlRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_auth_user_id" TEXT,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "recipient_auth_user_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "module" "ApprovalModule" NOT NULL,
    "documentId" TEXT NOT NULL,
    "role" "ApprovalStep" NOT NULL,
    "issuedTo" TEXT NOT NULL,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarMaster" (
    "id" TEXT NOT NULL,
    "carNo" TEXT NOT NULL,
    "carYear" INTEGER NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "status" "CarStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "CarSourceType" NOT NULL,
    "sourceDetail" TEXT,
    "isoStandards" TEXT[],
    "defectDetail" TEXT NOT NULL,
    "nonConformanceRef" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "issuer_auth_user_id" TEXT,
    "issuer_name" TEXT,
    "issuer_employee_id" TEXT,
    "issuerPosition" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "targetDepartmentId" TEXT NOT NULL,
    "target_auth_department_id" TEXT,
    "target_department_name" TEXT,
    "targetEmailGroup" TEXT,
    "responseDueAt" TIMESTAMP(3),
    "reCar" BOOLEAN NOT NULL DEFAULT false,
    "reCarRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarResponse" (
    "id" TEXT NOT NULL,
    "carMasterId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "responder_auth_user_id" TEXT,
    "responder_name" TEXT,
    "responder_employee_id" TEXT,
    "responderPosition" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whyAnalysis" TEXT NOT NULL,
    "additionalToolDetail" TEXT,
    "rootCausePerson" BOOLEAN NOT NULL DEFAULT false,
    "rootCauseMaterial" BOOLEAN NOT NULL DEFAULT false,
    "rootCauseMachine" BOOLEAN NOT NULL DEFAULT false,
    "rootCauseMethod" BOOLEAN NOT NULL DEFAULT false,
    "rootCauseOther" BOOLEAN NOT NULL DEFAULT false,
    "rootCauseOtherDetail" TEXT,
    "rootCauseSummary" TEXT NOT NULL,
    "immediateAction" TEXT NOT NULL,
    "preventiveAction" TEXT NOT NULL,
    "plannedCompletionDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarVerification" (
    "id" TEXT NOT NULL,
    "carMasterId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verifier_auth_user_id" TEXT,
    "verifier_name" TEXT,
    "verifier_employee_id" TEXT,
    "verifierPosition" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "findings" TEXT NOT NULL,
    "result" "VerificationResult" NOT NULL,
    "nextDueDate" TIMESTAMP(3),

    CONSTRAINT "CarVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarMrSignature" (
    "id" TEXT NOT NULL,
    "carMasterId" TEXT NOT NULL,
    "mrUserId" TEXT NOT NULL,
    "mr_auth_user_id" TEXT,
    "mr_user_name" TEXT,
    "mr_employee_id" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "CarMrSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarAttachment" (
    "id" TEXT NOT NULL,
    "carResponseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "spItemId" TEXT NOT NULL,
    "spWebUrl" TEXT NOT NULL,
    "spDownloadUrl" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploaded_by_auth_user_id" TEXT,
    "uploaded_by_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarMrResponseReview" (
    "id" TEXT NOT NULL,
    "carMasterId" TEXT NOT NULL,
    "mrUserId" TEXT NOT NULL,
    "mr_auth_user_id" TEXT,
    "mr_user_name" TEXT,
    "mr_employee_id" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "CarMrResponseReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarNotificationLog" (
    "id" TEXT NOT NULL,
    "carMasterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient" TEXT NOT NULL,

    CONSTRAINT "CarNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DarMaster_darNo_key" ON "DarMaster"("darNo");

-- CreateIndex
CREATE INDEX "DarMaster_status_idx" ON "DarMaster"("status");

-- CreateIndex
CREATE INDEX "DarMaster_requesterId_idx" ON "DarMaster"("requesterId");

-- CreateIndex
CREATE INDEX "DarMaster_departmentId_idx" ON "DarMaster"("departmentId");

-- CreateIndex
CREATE INDEX "DarAttachment_darMasterId_idx" ON "DarAttachment"("darMasterId");

-- CreateIndex
CREATE INDEX "DarAttachment_spItemId_idx" ON "DarAttachment"("spItemId");

-- CreateIndex
CREATE INDEX "DarApproval_darMasterId_idx" ON "DarApproval"("darMasterId");

-- CreateIndex
CREATE INDEX "DarApproval_assignedUserId_idx" ON "DarApproval"("assignedUserId");

-- CreateIndex
CREATE INDEX "ApprovalSignature_module_documentId_idx" ON "ApprovalSignature"("module", "documentId");

-- CreateIndex
CREATE INDEX "ApprovalSignature_signerUserId_idx" ON "ApprovalSignature"("signerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalSignature_module_documentId_step_key" ON "ApprovalSignature"("module", "documentId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "QmsProcessing_darMasterId_key" ON "QmsProcessing"("darMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "kpis_department_yearly_key" ON "kpis"("department", "yearly");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_monthly_reports_kpi_id_month_year_key" ON "kpi_monthly_reports"("kpi_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_monthly_details_monthly_report_id_kpi_objective_id_key" ON "kpi_monthly_details"("monthly_report_id", "kpi_objective_id");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentControl_docNumber_key" ON "DocumentControl"("docNumber");

-- CreateIndex
CREATE INDEX "DocumentControl_status_idx" ON "DocumentControl"("status");

-- CreateIndex
CREATE INDEX "DocumentControl_categoryId_idx" ON "DocumentControl"("categoryId");

-- CreateIndex
CREATE INDEX "DocumentControl_createdById_idx" ON "DocumentControl"("createdById");

-- CreateIndex
CREATE INDEX "DocumentControl_departmentId_idx" ON "DocumentControl"("departmentId");

-- CreateIndex
CREATE INDEX "DocumentCategory_departmentId_idx" ON "DocumentCategory"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_departmentId_name_key" ON "DocumentCategory"("departmentId", "name");

-- CreateIndex
CREATE INDEX "DocumentControlRevision_documentControlId_idx" ON "DocumentControlRevision"("documentControlId");

-- CreateIndex
CREATE INDEX "DocumentControlRevision_status_idx" ON "DocumentControlRevision"("status");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_idempotency_key_key" ON "notification_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "action_tokens_token_key" ON "action_tokens"("token");

-- CreateIndex
CREATE INDEX "action_tokens_token_idx" ON "action_tokens"("token");

-- CreateIndex
CREATE INDEX "action_tokens_documentId_module_idx" ON "action_tokens"("documentId", "module");

-- CreateIndex
CREATE INDEX "action_tokens_expiresAt_idx" ON "action_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CarMaster_carNo_key" ON "CarMaster"("carNo");

-- CreateIndex
CREATE INDEX "CarMaster_status_idx" ON "CarMaster"("status");

-- CreateIndex
CREATE INDEX "CarMaster_issuerId_idx" ON "CarMaster"("issuerId");

-- CreateIndex
CREATE INDEX "CarMaster_targetDepartmentId_idx" ON "CarMaster"("targetDepartmentId");

-- CreateIndex
CREATE INDEX "CarMaster_carYear_sequenceNo_idx" ON "CarMaster"("carYear", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "CarResponse_carMasterId_key" ON "CarResponse"("carMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "CarVerification_carMasterId_round_key" ON "CarVerification"("carMasterId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "CarMrSignature_carMasterId_key" ON "CarMrSignature"("carMasterId");

-- CreateIndex
CREATE INDEX "CarAttachment_carResponseId_idx" ON "CarAttachment"("carResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "CarMrResponseReview_carMasterId_key" ON "CarMrResponseReview"("carMasterId");

-- CreateIndex
CREATE INDEX "CarNotificationLog_carMasterId_idx" ON "CarNotificationLog"("carMasterId");

-- AddForeignKey
ALTER TABLE "DarItem" ADD CONSTRAINT "DarItem_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarDistribution" ADD CONSTRAINT "DarDistribution_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarAttachment" ADD CONSTRAINT "DarAttachment_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarApproval" ADD CONSTRAINT "DarApproval_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QmsProcessing" ADD CONSTRAINT "QmsProcessing_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_objectives" ADD CONSTRAINT "kpi_objectives_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_monthly_reports" ADD CONSTRAINT "kpi_monthly_reports_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_monthly_details" ADD CONSTRAINT "kpi_monthly_details_monthly_report_id_fkey" FOREIGN KEY ("monthly_report_id") REFERENCES "kpi_monthly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_monthly_details" ADD CONSTRAINT "kpi_monthly_details_kpi_objective_id_fkey" FOREIGN KEY ("kpi_objective_id") REFERENCES "kpi_objectives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_corrective_actions" ADD CONSTRAINT "kpi_corrective_actions_monthly_detail_id_fkey" FOREIGN KEY ("monthly_detail_id") REFERENCES "kpi_monthly_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControl" ADD CONSTRAINT "DocumentControl_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControlRevision" ADD CONSTRAINT "DocumentControlRevision_documentControlId_fkey" FOREIGN KEY ("documentControlId") REFERENCES "DocumentControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarMaster" ADD CONSTRAINT "CarMaster_reCarRefId_fkey" FOREIGN KEY ("reCarRefId") REFERENCES "CarMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarResponse" ADD CONSTRAINT "CarResponse_carMasterId_fkey" FOREIGN KEY ("carMasterId") REFERENCES "CarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarVerification" ADD CONSTRAINT "CarVerification_carMasterId_fkey" FOREIGN KEY ("carMasterId") REFERENCES "CarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarMrSignature" ADD CONSTRAINT "CarMrSignature_carMasterId_fkey" FOREIGN KEY ("carMasterId") REFERENCES "CarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarAttachment" ADD CONSTRAINT "CarAttachment_carResponseId_fkey" FOREIGN KEY ("carResponseId") REFERENCES "CarResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarMrResponseReview" ADD CONSTRAINT "CarMrResponseReview_carMasterId_fkey" FOREIGN KEY ("carMasterId") REFERENCES "CarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarNotificationLog" ADD CONSTRAINT "CarNotificationLog_carMasterId_fkey" FOREIGN KEY ("carMasterId") REFERENCES "CarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
