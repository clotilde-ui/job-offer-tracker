-- Backfill lgmSentAt from contactedAt for offers already sent to LGM
UPDATE "JobOffer"
SET "lgmSentAt" = "contactedAt"
WHERE "lgmSent" = 1 AND "lgmSentAt" IS NULL AND "contactedAt" IS NOT NULL;
