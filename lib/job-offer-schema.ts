import { prisma } from "@/lib/prisma";

let recruitingAgencyColumnEnsured = false;

function isAlreadyPresentError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("duplicate column") || message.includes("already exists");
}

function isMissingRecruitingAgencyColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("recruitingAgency") && (
    message.includes("no such column") ||
    message.includes("does not exist") ||
    message.includes("Unknown column")
  );
}

export async function ensureRecruitingAgencyColumn(): Promise<void> {
  if (recruitingAgencyColumnEnsured) return;

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "JobOffer" ADD COLUMN "recruitingAgency" BOOLEAN NOT NULL DEFAULT false'
    );
  } catch (error) {
    if (!isAlreadyPresentError(error)) throw error;
  }

  recruitingAgencyColumnEnsured = true;
}

export async function retryAfterEnsuringRecruitingAgencyColumn<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingRecruitingAgencyColumnError(error)) throw error;
    await ensureRecruitingAgencyColumn();
    return operation();
  }
}
