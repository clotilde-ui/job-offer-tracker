-- Add lgmAudiences to User (JSON array of audience names)
ALTER TABLE "User" ADD COLUMN "lgmAudiences" TEXT DEFAULT '[]';

-- Add lgmAudience to JobOffer (which audience was chosen for this lead)
ALTER TABLE "JobOffer" ADD COLUMN "lgmAudience" TEXT;
