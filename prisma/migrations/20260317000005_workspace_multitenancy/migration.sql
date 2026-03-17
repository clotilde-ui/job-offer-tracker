-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "lgmApiKey" TEXT,
    "lgmCampaignId" TEXT,
    "lgmAudiences" TEXT DEFAULT '[]',
    "aiProvider" TEXT,
    "claudeApiKey" TEXT,
    "geminiApiKey" TEXT,
    "groqApiKey" TEXT,
    "openaiApiKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Workspace_name_key" ON "Workspace"("name");
CREATE UNIQUE INDEX "Workspace_webhookToken_key" ON "Workspace"("webhookToken");

-- Workspace migration map
CREATE TABLE "_UserWorkspaceMap" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL
);

INSERT INTO "Workspace" (
  "id", "name", "webhookToken", "lgmApiKey", "lgmCampaignId", "lgmAudiences",
  "aiProvider", "claudeApiKey", "geminiApiKey", "groqApiKey", "openaiApiKey", "createdAt", "updatedAt"
)
SELECT
  lower(hex(randomblob(4))) || lower(hex(randomblob(2))) || '4' || substr(lower(hex(randomblob(2))), 2) ||
  substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || lower(hex(randomblob(6))) as id,
  COALESCE(NULLIF(trim(u."name"), ''), u."email") || '-' || substr(u."id", 1, 8),
  u."webhookToken",
  u."lgmApiKey",
  u."lgmCampaignId",
  u."lgmAudiences",
  u."aiProvider",
  u."claudeApiKey",
  u."geminiApiKey",
  u."groqApiKey",
  u."openaiApiKey",
  u."createdAt",
  u."updatedAt"
FROM "User" u;

INSERT INTO "_UserWorkspaceMap" ("userId", "workspaceId")
SELECT u."id", w."id"
FROM "User" u
JOIN "Workspace" w ON w."webhookToken" = u."webhookToken";

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "workspaceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_User" ("id", "email", "password", "name", "role", "workspaceId", "createdAt", "updatedAt")
SELECT u."id", u."email", u."password", u."name", u."role",
       CASE WHEN u."role" = 'ADMIN' THEN NULL ELSE m."workspaceId" END,
       u."createdAt", u."updatedAt"
FROM "User" u
LEFT JOIN "_UserWorkspaceMap" m ON m."userId" = u."id";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

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
    "lgmAudience" TEXT,
    "customValues" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "JobOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_JobOffer" (
  "id", "workspaceId", "title", "description", "url", "company", "linkedinPage", "website", "phone", "headquarters",
  "offerLocation", "source", "publishedAt", "receivedAt", "leadCivility", "leadFirstName", "leadLastName", "leadEmail",
  "leadJobTitle", "leadLinkedin", "leadPhone", "toContact", "doNotContact", "contactedAt", "lgmSent", "lgmAudience", "customValues"
)
SELECT j."id", m."workspaceId", j."title", j."description", j."url", j."company", j."linkedinPage", j."website", j."phone", j."headquarters",
       j."offerLocation", j."source", j."publishedAt", j."receivedAt", j."leadCivility", j."leadFirstName", j."leadLastName", j."leadEmail",
       j."leadJobTitle", j."leadLinkedin", j."leadPhone", j."toContact", j."doNotContact", j."contactedAt", j."lgmSent", j."lgmAudience", j."customValues"
FROM "JobOffer" j
JOIN "_UserWorkspaceMap" m ON m."userId" = j."userId";

DROP TABLE "JobOffer";
ALTER TABLE "new_JobOffer" RENAME TO "JobOffer";
CREATE INDEX "JobOffer_workspaceId_idx" ON "JobOffer"("workspaceId");
CREATE INDEX "JobOffer_toContact_idx" ON "JobOffer"("toContact");
CREATE INDEX "JobOffer_receivedAt_idx" ON "JobOffer"("receivedAt");

CREATE TABLE "new_CustomFieldDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "formula" TEXT,
    "lgmAttribute" TEXT,
    "autoFill" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomFieldDef_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_CustomFieldDef" ("id", "workspaceId", "name", "label", "type", "formula", "lgmAttribute", "autoFill", "order", "createdAt")
SELECT c."id", m."workspaceId", c."name", c."label", c."type", c."formula", c."lgmAttribute", c."autoFill", c."order", c."createdAt"
FROM "CustomFieldDef" c
JOIN "_UserWorkspaceMap" m ON m."userId" = c."userId";

DROP TABLE "CustomFieldDef";
ALTER TABLE "new_CustomFieldDef" RENAME TO "CustomFieldDef";
CREATE UNIQUE INDEX "CustomFieldDef_workspaceId_name_key" ON "CustomFieldDef"("workspaceId", "name");

DROP TABLE "_UserWorkspaceMap";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
