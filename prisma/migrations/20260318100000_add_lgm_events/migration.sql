-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN "lgmConnectionSentAt" DATETIME;
ALTER TABLE "JobOffer" ADD COLUMN "lgmConnectionAcceptedAt" DATETIME;
ALTER TABLE "JobOffer" ADD COLUMN "lgmMessage1SentAt" DATETIME;
ALTER TABLE "JobOffer" ADD COLUMN "lgmRepliedAt" DATETIME;
ALTER TABLE "JobOffer" ADD COLUMN "lgmReplyContent" TEXT;
ALTER TABLE "JobOffer" ADD COLUMN "lgmEvents" TEXT NOT NULL DEFAULT '[]';
