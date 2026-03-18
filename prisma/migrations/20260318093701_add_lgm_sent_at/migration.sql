-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN "lgmSentAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workspace" (
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Workspace" ("aiProvider", "claudeApiKey", "createdAt", "geminiApiKey", "groqApiKey", "id", "lgmApiKey", "lgmAudiences", "lgmCampaignId", "name", "openaiApiKey", "updatedAt", "webhookToken") SELECT "aiProvider", "claudeApiKey", "createdAt", "geminiApiKey", "groqApiKey", "id", "lgmApiKey", "lgmAudiences", "lgmCampaignId", "name", "openaiApiKey", "updatedAt", "webhookToken" FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
CREATE UNIQUE INDEX "Workspace_name_key" ON "Workspace"("name");
CREATE UNIQUE INDEX "Workspace_webhookToken_key" ON "Workspace"("webhookToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
