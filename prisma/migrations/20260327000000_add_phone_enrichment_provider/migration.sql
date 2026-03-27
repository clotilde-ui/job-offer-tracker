-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "phoneEnrichmentProvider" TEXT NOT NULL DEFAULT 'apollo';
ALTER TABLE "Workspace" ADD COLUMN "derrickApiKey" TEXT;
