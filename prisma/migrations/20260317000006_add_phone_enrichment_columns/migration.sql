ALTER TABLE "JobOffer" ADD COLUMN "phoneLookupRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobOffer" ADD COLUMN "enrichedPhone" TEXT;
