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
    "apolloEnrichmentStatus" TEXT NOT NULL DEFAULT 'not_requested',
    "lgmLeadId" TEXT,
    "lgmMessagesSent" INTEGER,
    "lgmEmailOpened" INTEGER,
    "lgmConnectionSentAt" DATETIME,
    "lgmConnectionAcceptedAt" DATETIME,
    "lgmMessage1SentAt" DATETIME,
    "lgmRepliedAt" DATETIME,
    "lgmReplyContent" TEXT,
    "lgmEvents" TEXT DEFAULT '[]',
    "recruitingAgency" BOOLEAN NOT NULL DEFAULT false,
    "callRequested" BOOLEAN NOT NULL DEFAULT false,
    "customValues" TEXT NOT NULL DEFAULT '{}',
    "duplicateWarning" TEXT,
    CONSTRAINT "JobOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobOffer" ("apolloEnrichmentStatus", "callRequested", "company", "contactedAt", "customValues", "description", "doNotContact", "duplicateWarning", "enrichedPhone", "headquarters", "id", "leadCivility", "leadEmail", "leadFirstName", "leadJobTitle", "leadLastName", "leadLinkedin", "leadPhone", "lgmAudience", "lgmConnectionAcceptedAt", "lgmConnectionSentAt", "lgmEmailOpened", "lgmEvents", "lgmLeadId", "lgmMessage1SentAt", "lgmMessagesSent", "lgmRepliedAt", "lgmReplyContent", "lgmSent", "lgmSentAt", "linkedinPage", "offerLocation", "phone", "phoneLookupRequested", "publishedAt", "receivedAt", "source", "title", "toContact", "url", "website", "workspaceId") SELECT "apolloEnrichmentStatus", "callRequested", "company", "contactedAt", "customValues", "description", "doNotContact", "duplicateWarning", "enrichedPhone", "headquarters", "id", "leadCivility", "leadEmail", "leadFirstName", "leadJobTitle", "leadLastName", "leadLinkedin", "leadPhone", "lgmAudience", "lgmConnectionAcceptedAt", "lgmConnectionSentAt", "lgmEmailOpened", "lgmEvents", "lgmLeadId", "lgmMessage1SentAt", "lgmMessagesSent", "lgmRepliedAt", "lgmReplyContent", "lgmSent", "lgmSentAt", "linkedinPage", "offerLocation", "phone", "phoneLookupRequested", "publishedAt", "receivedAt", "source", "title", "toContact", "url", "website", "workspaceId" FROM "JobOffer";
DROP TABLE "JobOffer";
ALTER TABLE "new_JobOffer" RENAME TO "JobOffer";
CREATE INDEX "JobOffer_workspaceId_idx" ON "JobOffer"("workspaceId");
CREATE INDEX "JobOffer_toContact_idx" ON "JobOffer"("toContact");
CREATE INDEX "JobOffer_receivedAt_idx" ON "JobOffer"("receivedAt");
CREATE TABLE "new_Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "lgmApiKey" TEXT,
    "lgmCampaignId" TEXT,
    "lgmAudiences" TEXT DEFAULT '[]',
    "lgmIdentityId" TEXT,
    "lgmMemberId" TEXT,
    "aiProvider" TEXT,
    "claudeApiKey" TEXT,
    "geminiApiKey" TEXT,
    "groqApiKey" TEXT,
    "openaiApiKey" TEXT,
    "mantiksApiKey" TEXT,
    "apolloApiKey" TEXT,
    "phoneEnrichmentProvider" TEXT DEFAULT 'apollo',
    "derrickApiKey" TEXT,
    "prospectingProvider" TEXT DEFAULT 'lgm',
    "emeliApiKey" TEXT,
    "emeliaCampaigns" TEXT DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Workspace" ("aiProvider", "apolloApiKey", "claudeApiKey", "createdAt", "derrickApiKey", "emeliApiKey", "emeliaCampaigns", "geminiApiKey", "groqApiKey", "id", "lgmApiKey", "lgmAudiences", "lgmCampaignId", "lgmIdentityId", "lgmMemberId", "mantiksApiKey", "name", "openaiApiKey", "phoneEnrichmentProvider", "prospectingProvider", "updatedAt", "webhookToken") SELECT "aiProvider", "apolloApiKey", "claudeApiKey", "createdAt", "derrickApiKey", "emeliApiKey", "emeliaCampaigns", "geminiApiKey", "groqApiKey", "id", "lgmApiKey", "lgmAudiences", "lgmCampaignId", "lgmIdentityId", "lgmMemberId", "mantiksApiKey", "name", "openaiApiKey", "phoneEnrichmentProvider", "prospectingProvider", "updatedAt", "webhookToken" FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
CREATE UNIQUE INDEX "Workspace_name_key" ON "Workspace"("name");
CREATE UNIQUE INDEX "Workspace_webhookToken_key" ON "Workspace"("webhookToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
