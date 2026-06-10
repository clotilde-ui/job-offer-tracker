import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureRecruitingAgencyColumn } from "@/lib/job-offer-schema";
import { resolveWorkspaceId } from "@/lib/workspace-access";

const MAX_IMPORT_ROWS = 2_000;

type JobOfferField =
  | "title"
  | "description"
  | "url"
  | "company"
  | "linkedinPage"
  | "website"
  | "phone"
  | "headquarters"
  | "offerLocation"
  | "source"
  | "publishedAt"
  | "leadCivility"
  | "leadFirstName"
  | "leadLastName"
  | "leadEmail"
  | "leadJobTitle"
  | "leadLinkedin"
  | "leadPhone"
  | "toContact"
  | "doNotContact"
  | "recruitingAgency"
  | "callRequested"
  | "phoneLookupRequested"
  | "enrichedPhone";
type CsvRow = Record<string, unknown>;

type ImportBody = {
  rows?: CsvRow[];
  mapping?: Partial<Record<JobOfferField, string>>;
  customMapping?: Record<string, string>;
};

function cleanString(value: unknown, maxLength = 1000): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function cleanUrl(value: unknown): string | null {
  const text = cleanString(value, 2000);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return text;
  } catch {
    return null;
  }
}

function parseBoolean(value: unknown): boolean {
  const text = cleanString(value, 50)?.toLowerCase();
  if (!text) return false;
  return ["1", "true", "vrai", "oui", "yes", "y", "x", "checked", "contact", "contacté", "a contacter", "à contacter"].includes(text);
}

function parseDate(value: unknown): Date | null {
  const text = cleanString(value, 100);
  if (!text) return null;

  const iso = new Date(text);
  if (!Number.isNaN(iso.getTime())) return iso;

  const frMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!frMatch) return null;

  const [, day, month, rawYear] = frMatch;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mappedValue(row: CsvRow, mapping: Partial<Record<JobOfferField, string>>, field: JobOfferField): unknown {
  const column = mapping[field];
  if (!column) return null;
  return row[column];
}

function normalizeCivility(value: unknown): string | null {
  const text = cleanString(value, 30);
  if (!text) return null;
  const lower = text.toLowerCase();
  if (["m", "m.", "mr", "mr.", "monsieur"].includes(lower)) return "Monsieur";
  if (["mme", "madame", "ms", "ms.", "mrs", "mrs."].includes(lower)) return "Madame";
  return text;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const workspaceId = resolveWorkspaceId(session, req, "targetWorkspaceId");
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  await ensureRecruitingAgencyColumn();

  let body: ImportBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return NextResponse.json({ error: "Aucune ligne CSV à importer" }, { status: 400 });
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: `Import limité à ${MAX_IMPORT_ROWS} lignes à la fois` }, { status: 400 });
  }

  const mapping = body.mapping ?? {};
  const customMapping = body.customMapping ?? {};
  const customFields = await prisma.customFieldDef.findMany({ where: { workspaceId } });
  const customFieldNames = new Set(customFields.map((field) => field.name));

  const data = rows.map((row) => {
    const customValues: Record<string, unknown> = {};
    for (const [fieldName, column] of Object.entries(customMapping)) {
      if (!customFieldNames.has(fieldName) || !column) continue;
      const value = row[column];
      if (value != null && String(value).trim() !== "") customValues[fieldName] = value;
    }

    return {
      workspaceId,
      title: cleanString(mappedValue(row, mapping, "title"), 500) ?? "Sans titre",
      description: cleanString(mappedValue(row, mapping, "description"), 10000),
      url: cleanUrl(mappedValue(row, mapping, "url")),
      company: cleanString(mappedValue(row, mapping, "company"), 500) ?? "Inconnu",
      linkedinPage: cleanUrl(mappedValue(row, mapping, "linkedinPage")),
      website: cleanUrl(mappedValue(row, mapping, "website")),
      phone: cleanString(mappedValue(row, mapping, "phone"), 50),
      headquarters: cleanString(mappedValue(row, mapping, "headquarters"), 500),
      offerLocation: cleanString(mappedValue(row, mapping, "offerLocation"), 500),
      source: cleanString(mappedValue(row, mapping, "source"), 200) ?? "Import CSV",
      publishedAt: parseDate(mappedValue(row, mapping, "publishedAt")),
      leadCivility: normalizeCivility(mappedValue(row, mapping, "leadCivility")),
      leadFirstName: cleanString(mappedValue(row, mapping, "leadFirstName"), 100),
      leadLastName: cleanString(mappedValue(row, mapping, "leadLastName"), 100),
      leadEmail: cleanString(mappedValue(row, mapping, "leadEmail"), 254),
      leadJobTitle: cleanString(mappedValue(row, mapping, "leadJobTitle"), 200),
      leadLinkedin: cleanUrl(mappedValue(row, mapping, "leadLinkedin")),
      leadPhone: cleanString(mappedValue(row, mapping, "leadPhone"), 50),
      toContact: parseBoolean(mappedValue(row, mapping, "toContact")),
      doNotContact: parseBoolean(mappedValue(row, mapping, "doNotContact")),
      recruitingAgency: parseBoolean(mappedValue(row, mapping, "recruitingAgency")),
      callRequested: parseBoolean(mappedValue(row, mapping, "callRequested")),
      phoneLookupRequested: parseBoolean(mappedValue(row, mapping, "phoneLookupRequested")),
      enrichedPhone: cleanString(mappedValue(row, mapping, "enrichedPhone"), 50),
      customValues: JSON.stringify(customValues),
    };
  });

  const result = await prisma.jobOffer.createMany({ data });
  return NextResponse.json({ imported: result.count });
}
