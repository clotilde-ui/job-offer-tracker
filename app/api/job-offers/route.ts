import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/workspace-access";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const workspaceId = resolveWorkspaceId(session, req, "targetWorkspaceId");
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const where: Record<string, unknown> = {
    workspaceId,
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { company: { contains: search } },
            { leadFirstName: { contains: search } },
            { leadLastName: { contains: search } },
            { leadEmail: { contains: search } },
          ],
        }
      : {}),
  };

  const rawSortBy = searchParams.get("sortBy") ?? "receivedAt";
  const rawSortDir = searchParams.get("sortDir") ?? "desc";
  const filterStatus = searchParams.get("filterStatus");
  const activeStatuses = filterStatus ? filterStatus.split(",") : [];

  const SORTABLE = ["receivedAt", "publishedAt", "title", "company", "offerLocation", "source"];
  const sortBy = SORTABLE.includes(rawSortBy) ? rawSortBy : "receivedAt";
  const sortDir = rawSortDir === "asc" ? "asc" : "desc";

  if (activeStatuses.length > 0) {
    const orClauses: Record<string, unknown>[] = [];
    if (activeStatuses.includes("qualify")) orClauses.push({ toContact: false, doNotContact: false });
    if (activeStatuses.includes("contact")) orClauses.push({ toContact: true });
    if (activeStatuses.includes("doNotContact")) orClauses.push({ doNotContact: true });
    if (orClauses.length > 0) Object.assign(where, { OR: orClauses });
  }

  if (searchParams.get("format") === "csv") {
    const [allOffers, customFieldDefs] = await Promise.all([
      prisma.jobOffer.findMany({ where, orderBy: { [sortBy]: sortDir } }),
      prisma.customFieldDef.findMany({ where: { workspaceId }, orderBy: { order: "asc" } }),
    ]);

    const fixedHeaders = [
      "Offre d'emploi", "Entreprise", "Localisation", "Source", "Date offre", "Lead", "Email lead", "Métier lead", "LinkedIn lead",
      "Chercher numéro", "Numéro de téléphone", "Statut contact", "Audience LGM", "LGM envoyé",
    ];
    const headers = [...fixedHeaders, ...customFieldDefs.map((f) => f.label)];

    function escapeCsv(val: unknown): string {
      if (val == null) return "";
      const s = String(val);
      return s.includes('"') || s.includes(",") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }

    const rows = allOffers.map((offer) => {
      let customValues: Record<string, unknown> = {};
      try { customValues = JSON.parse(offer.customValues ?? "{}"); } catch {}

      const contactStatus = offer.doNotContact ? "Ne pas contacter" : offer.toContact ? "Contacté" : "À qualifier";
      const fixed = [
        offer.title,
        offer.company,
        offer.offerLocation ?? "",
        offer.source ?? "",
        offer.publishedAt ? new Date(offer.publishedAt).toLocaleDateString("fr-FR") : "",
        [offer.leadCivility, offer.leadFirstName, offer.leadLastName].filter(Boolean).join(" "),
        offer.leadEmail ?? "",
        offer.leadJobTitle ?? "",
        offer.leadLinkedin ?? "",
        offer.phoneLookupRequested ? "Oui" : "Non",
        offer.enrichedPhone ?? "",
        contactStatus,
        offer.lgmAudience ?? "",
        offer.lgmSentAt ? new Date(offer.lgmSentAt).toLocaleDateString("fr-FR") : "",
      ];

      const custom = customFieldDefs.map((f) => customValues[f.name] ?? "");
      return [...fixed, ...custom].map(escapeCsv).join(",");
    });

    const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"leads-export.csv\"",
      },
    });
  }

  const rawPage = parseInt(searchParams.get("page") ?? "1");
  const rawLimit = parseInt(searchParams.get("limit") ?? "50");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;

  const [rawData, total, statsAll, statsToContact, statsDNC] = await Promise.all([
    prisma.jobOffer.findMany({ where, orderBy: { [sortBy]: sortDir }, skip: (page - 1) * limit, take: limit }),
    prisma.jobOffer.count({ where }),
    prisma.jobOffer.count({ where: { workspaceId } }),
    prisma.jobOffer.count({ where: { workspaceId, toContact: true } }),
    prisma.jobOffer.count({ where: { workspaceId, doNotContact: true } }),
  ]);

  const data = rawData.map((offer) => {
    let customValues: Record<string, unknown> = {};
    try { customValues = JSON.parse(offer.customValues ?? "{}"); } catch {}
    return { ...offer, customValues };
  });

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    stats: {
      all: statsAll,
      toContact: statsToContact,
      doNotContact: statsDNC,
      qualify: statsAll - statsToContact - statsDNC,
    },
  });
}
