-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "company" TEXT NOT NULL,
    "linkedinPage" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "headquarters" TEXT,
    "offerLocation" TEXT,
    "source" TEXT,
    "publishedAt" DATETIME,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadCivility" TEXT,
    "leadFirstName" TEXT,
    "leadLastName" TEXT,
    "leadEmail" TEXT,
    "leadJobTitle" TEXT,
    "leadLinkedin" TEXT,
    "leadPhone" TEXT,
    "toContact" BOOLEAN NOT NULL DEFAULT false,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" DATETIME,
    "lgmSent" BOOLEAN NOT NULL DEFAULT false,
    "lgmSentAt" DATETIME,
    "lgmAudience" TEXT,
    "phoneLookupRequested" BOOLEAN NOT NULL DEFAULT false,
    "enrichedPhone" TEXT,
    "lgmConnectionSentAt" DATETIME,
    "lgmConnectionAcceptedAt" DATETIME,
    "lgmMessage1SentAt" DATETIME,
    "lgmRepliedAt" DATETIME,
    "lgmReplyContent" TEXT,
    "lgmEvents" TEXT DEFAULT '[]',
    "customValues" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "JobOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobOffer" ("company", "contactedAt", "customValues", "description", "doNotContact", "enrichedPhone", "headquarters", "id", "leadCivility", "leadEmail", "leadFirstName", "leadJobTitle", "leadLastName", "leadLinkedin", "leadPhone", "lgmAudience", "lgmConnectionAcceptedAt", "lgmConnectionSentAt", "lgmEvents", "lgmMessage1SentAt", "lgmRepliedAt", "lgmReplyContent", "lgmSent", "lgmSentAt", "linkedinPage", "offerLocation", "phone", "phoneLookupRequested", "publishedAt", "receivedAt", "source", "title", "toContact", "url", "website", "workspaceId") SELECT "company", "contactedAt", "customValues", "description", "doNotContact", "enrichedPhone", "headquarters", "id", "leadCivility", "leadEmail", "leadFirstName", "leadJobTitle", "leadLastName", "leadLinkedin", "leadPhone", "lgmAudience", "lgmConnectionAcceptedAt", "lgmConnectionSentAt", "lgmEvents", "lgmMessage1SentAt", "lgmRepliedAt", "lgmReplyContent", "lgmSent", "lgmSentAt", "linkedinPage", "offerLocation", "phone", "phoneLookupRequested", "publishedAt", "receivedAt", "source", "title", "toContact", "url", "website", "workspaceId" FROM "JobOffer";
DROP TABLE "JobOffer";
ALTER TABLE "new_JobOffer" RENAME TO "JobOffer";
CREATE INDEX "JobOffer_workspaceId_idx" ON "JobOffer"("workspaceId");
CREATE INDEX "JobOffer_toContact_idx" ON "JobOffer"("toContact");
CREATE INDEX "JobOffer_receivedAt_idx" ON "JobOffer"("receivedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
