import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callAIProvider } from "@/lib/ai-generate";

// Simple in-memory rate limiter: max 60 requests per minute per token
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(token: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(token);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(token, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function sanitizeUrl(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  try {
    const url = new URL(str);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return str;
  } catch {
    return null;
  }
}

function sanitizeString(value: unknown, maxLength = 1000): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).slice(0, maxLength);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (isRateLimited(token)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { webhookToken: token },
    select: {
      id: true,
      aiProvider: true,
      claudeApiKey: true,
      geminiApiKey: true,
      groqApiKey: true,
      openaiApiKey: true,
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Le fournisseur envoie { leads: [...] }
  const leads: Record<string, unknown>[] = Array.isArray(body.leads)
    ? body.leads
    : Array.isArray(body)
    ? body
    : [body];

  const created = await Promise.all(
    leads.map(async (lead: Record<string, unknown>) => {
      return prisma.jobOffer.create({
        data: {
          workspaceId: workspace.id,
          title: sanitizeString(lead.job_offer_title) ?? "Sans titre",
          description: sanitizeString(lead.job_offer_description, 10000),
          url: sanitizeUrl(lead.job_offer_url),
          company: sanitizeString(lead.company_name) ?? "Inconnu",
          linkedinPage: sanitizeUrl(lead.company_linkedin),
          website: sanitizeUrl(lead.company_website),
          phone: sanitizeString(lead.company_phone, 50),
          headquarters: sanitizeString(lead.hq_location, 500),
          offerLocation: sanitizeString(lead.job_offer_location, 500),
          source: sanitizeString(lead.job_offer_source, 200),
          publishedAt: lead.job_creation_date
            ? new Date(String(lead.job_creation_date))
            : null,
          leadCivility: sanitizeString(lead.lead_civility, 20),
          leadFirstName: sanitizeString(lead.lead_first_name, 100),
          leadLastName: sanitizeString(lead.lead_last_name, 100),
          leadEmail: sanitizeString(lead.lead_email, 254),
          leadJobTitle: sanitizeString(lead.lead_job_title, 200),
          leadLinkedin: sanitizeUrl(lead.lead_linkedin),
          leadPhone: sanitizeString(lead.lead_phones, 50),
        },
      });
    })
  );

  // Répondre immédiatement — auto-fill IA en arrière-plan
  const response = NextResponse.json({ received: created.length }, { status: 201 });

  // Auto-fill asynchrone : ne bloque pas la réponse
  const autoFillFields = await prisma.customFieldDef.findMany({
    where: { workspaceId: workspace.id, type: "AI", autoFill: true },
  });

  if (autoFillFields.length > 0) {
    Promise.allSettled(
      created.flatMap((offer) =>
        autoFillFields.map(async (field) => {
          if (!field.formula) return;
          try {
            const value = await callAIProvider(workspace, field.formula, offer);
            const customValues = JSON.parse(offer.customValues || "{}");
            customValues[field.name] = value;
            await prisma.jobOffer.update({
              where: { id: offer.id },
              data: { customValues: JSON.stringify(customValues) },
            });
          } catch (e) {
            console.error(`Auto-fill IA [${field.name}] offre ${offer.id}:`, e);
          }
        })
      )
    ).catch(() => {});
  }

  return response;
}

// Endpoint GET pour vérifier que le webhook est actif
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { webhookToken: token },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  return NextResponse.json({ status: "ok" });
}
