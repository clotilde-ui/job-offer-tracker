-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "prospectingProvider" TEXT NOT NULL DEFAULT 'lgm';
ALTER TABLE "Workspace" ADD COLUMN "emeliApiKey" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emeliaCampaigns" TEXT NOT NULL DEFAULT '[]';
