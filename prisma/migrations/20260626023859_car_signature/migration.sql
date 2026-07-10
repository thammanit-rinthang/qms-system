-- CreateEnum
CREATE TYPE "CarResponseType" AS ENUM ('FIVE_WHY', 'OTHER');

-- AlterTable
ALTER TABLE "CarMaster" ADD COLUMN     "issuer_signature_path" TEXT;

-- AlterTable
ALTER TABLE "CarResponse" ADD COLUMN     "five_whys" JSONB,
ADD COLUMN     "responder_signature_path" TEXT,
ADD COLUMN     "response_type" "CarResponseType" NOT NULL DEFAULT 'FIVE_WHY',
ALTER COLUMN "whyAnalysis" SET DEFAULT '';

-- AlterTable
ALTER TABLE "CarVerification" ADD COLUMN     "verifier_signature_path" TEXT;
