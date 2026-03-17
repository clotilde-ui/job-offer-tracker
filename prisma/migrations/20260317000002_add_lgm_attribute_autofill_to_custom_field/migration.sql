-- AlterTable
ALTER TABLE "CustomFieldDef" ADD COLUMN "lgmAttribute" TEXT;
ALTER TABLE "CustomFieldDef" ADD COLUMN "autoFill"     INTEGER NOT NULL DEFAULT 0;
