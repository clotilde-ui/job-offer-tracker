import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const user = await prisma.user.findUnique({
    where: { webhookToken: token },
  });

  if (!user) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Mantiks peut envoyer un tableau ou un objet unique
  const offers = Array.isArray(body) ? body : [body];

  const created = await Promise.all(
    offers.map(async (offer: Record<string, unknown>) => {
      return prisma.jobOffer.create({
        data: {
          userId: user.id,
          title: sanitizeString(offer.job_title ?? offer.title) ?? "Sans titre",
          description: sanitizeString(offer.description, 10000),
          url: sanitizeUrl(offer.job_url ?? offer.url),
          company: sanitizeString(offer.company ?? offer.company_name) ?? "Inconnu",
          linkedinPage: sanitizeUrl(offer.company_linkedin),
          website: sanitizeUrl(offer.company_website),
          phone: sanitizeString(offer.company_phone, 50),
          headquarters: sanitizeString(offer.company_location ?? offer.headquarters, 500),
          offerLocation: sanitizeString(offer.location ?? offer.job_location, 500),
          source: sanitizeString(offer.source, 200),
          publishedAt: (offer.published_at ?? offer.created_at)
            ? new Date(String(offer.published_at ?? offer.created_at))
            : null,
          leadCivility: sanitizeString(offer.lead_civility ?? offer.civility, 20),
          leadFirstName: sanitizeString(offer.lead_first_name ?? offer.first_name, 100),
          leadLastName: sanitizeString(offer.lead_last_name ?? offer.last_name, 100),
          leadEmail: sanitizeString(offer.lead_email ?? offer.email, 254),
          leadJobTitle: sanitizeString(offer.lead_job_title ?? offer.lead_position, 200),
          leadLinkedin: sanitizeUrl(offer.lead_linkedin),
          leadPhone: sanitizeString(offer.lead_phone, 50),
        },
      });
    })
  );

  return NextResponse.json({ received: created.length }, { status: 201 });
}

// Endpoint GET pour vérifier que le webhook est actif
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const user = await prisma.user.findUnique({
    where: { webhookToken: token },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  return NextResponse.json({ status: "ok" });
}
