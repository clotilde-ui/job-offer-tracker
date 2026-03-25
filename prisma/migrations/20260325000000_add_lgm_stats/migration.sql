-- AlterTable: add LGM stats fields to JobOffer
ALTER TABLE "JobOffer" ADD COLUMN "lgmLeadId" TEXT;
ALTER TABLE "JobOffer" ADD COLUMN "lgmMessagesSent" INTEGER;
ALTER TABLE "JobOffer" ADD COLUMN "lgmEmailOpened" INTEGER;
