CREATE TABLE "document_distributions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "dar_master_id" TEXT NOT NULL,
    "revision_id" TEXT NOT NULL,
    "stamp_image_key" TEXT NOT NULL,
    "stamp_image_box" JSONB NOT NULL,
    "date_field_box" JSONB NOT NULL,
    "copy_to_field_box" JSONB NOT NULL,
    "base_pdf_sp_item_id" TEXT,
    "base_pdf_sp_web_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "link_to_document_control" BOOLEAN NOT NULL DEFAULT true,
    "published_by_id" TEXT NOT NULL,
    "published_by_auth_user_id" TEXT,
    "published_by_name" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_distributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_distribution_targets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "distribution_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "department_code" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "downloaded_at" TIMESTAMP(3),
    "downloaded_by_id" TEXT,
    "downloaded_by_name" TEXT,
    "final_pdf_sp_item_id" TEXT,
    "final_pdf_sp_web_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_distribution_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_distributions_revision_id_key" ON "document_distributions"("revision_id");
CREATE INDEX "document_distributions_dar_master_id_idx" ON "document_distributions"("dar_master_id");
CREATE UNIQUE INDEX "document_distribution_targets_distribution_id_department_id_key" ON "document_distribution_targets"("distribution_id", "department_id");

ALTER TABLE "document_distributions"
  ADD CONSTRAINT "document_distributions_dar_master_id_fkey"
  FOREIGN KEY ("dar_master_id") REFERENCES "DarMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_distributions"
  ADD CONSTRAINT "document_distributions_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "DocumentControlRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_distribution_targets"
  ADD CONSTRAINT "document_distribution_targets_distribution_id_fkey"
  FOREIGN KEY ("distribution_id") REFERENCES "document_distributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
