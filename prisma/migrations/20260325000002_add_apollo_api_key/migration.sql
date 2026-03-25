-- AlterTable: add Apollo API key to Workspace
ALTER TABLE "Workspace" ADD COLUMN "apolloApiKey" TEXT;
