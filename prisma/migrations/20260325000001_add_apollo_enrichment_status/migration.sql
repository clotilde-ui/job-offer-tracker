-- AlterTable: add Apollo enrichment status to JobOffer
ALTER TABLE "JobOffer" ADD COLUMN "apolloEnrichmentStatus" TEXT NOT NULL DEFAULT 'not_requested';
