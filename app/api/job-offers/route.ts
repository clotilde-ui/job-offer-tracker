import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { retryAfterEnsuringRecruitingAgencyColumn } from "@/lib/job-offer-schema";
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
    const [allOffers, customFieldDefs] = await retryAfterEnsuringRecruitingAgencyColumn(() =>
      Promise.all([
        prisma.jobOffer.findMany({ where, orderBy: { [sortBy]: sortDir } }),
        prisma.customFieldDef.findMany({ where: { workspaceId }, orderBy: { order: "asc" } }),
      ])
    );

    function escapeCsv(val: unknown): string {
      if (val == null) return "";
      const s = String(val);
      return s.includes('"') || s.includes(",") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }

    function fmtDate(d: Date | null | undefined): string {
      return d ? new Date(d).toLocaleDateString("fr-FR") : "";
    }

    // Colonnes fixes, dans le même ordre et avec les mêmes clés que le tableau.
    const fixedColumns: { key: string; label: string; value: (offer: typeof allOffers[number]) => unknown }[] = [
      { key: "toContact", label: "Statut contact", value: (o) => (o.doNotContact ? "Ne pas contacter" : o.toContact ? "Contacté" : "À qualifier") },
      { key: "recruitingAgency", label: "Cabinet recrutement", value: (o) => (o.recruitingAgency ? "Oui" : "Non") },
      { key: "title", label: "Offre d'emploi", value: (o) => o.title },
      { key: "url", label: "URL de l'offre", value: (o) => o.url ?? "" },
      { key: "description", label: "Description", value: (o) => o.description ?? "" },
      { key: "company", label: "Entreprise", value: (o) => o.company },
      { key: "linkedinPage", label: "LinkedIn entreprise", value: (o) => o.linkedinPage ?? "" },
      { key: "website", label: "Site web", value: (o) => o.website ?? "" },
      { key: "phone", label: "Tél. entreprise", value: (o) => o.phone ?? "" },
      { key: "headquarters", label: "Siège social", value: (o) => o.headquarters ?? "" },
      { key: "offerLocation", label: "Localisation", value: (o) => o.offerLocation ?? "" },
      { key: "source", label: "Source", value: (o) => o.source ?? "" },
      { key: "publishedAt", label: "Date offre", value: (o) => fmtDate(o.publishedAt) },
      { key: "receivedAt", label: "Date réception", value: (o) => fmtDate(o.receivedAt) },
      { key: "leadName", label: "Lead", value: (o) => [o.leadCivility, o.leadFirstName, o.leadLastName].filter(Boolean).join(" ") },
      { key: "leadCivility", label: "Civilité", value: (o) => o.leadCivility ?? "" },
      { key: "leadFirstName", label: "Prénom lead", value: (o) => o.leadFirstName ?? "" },
      { key: "leadLastName", label: "Nom lead", value: (o) => o.leadLastName ?? "" },
      { key: "leadEmail", label: "Email lead", value: (o) => o.leadEmail ?? "" },
      { key: "leadJobTitle", label: "Métier lead", value: (o) => o.leadJobTitle ?? "" },
      { key: "leadLinkedin", label: "LinkedIn lead", value: (o) => o.leadLinkedin ?? "" },
      { key: "leadPhone", label: "Tél. lead", value: (o) => o.leadPhone ?? "" },
      { key: "phoneLookupRequested", label: "Chercher tél.", value: (o) => (o.phoneLookupRequested ? "Oui" : "Non") },
      { key: "enrichedPhone", label: "Numéro de téléphone", value: (o) => o.enrichedPhone ?? "" },
      { key: "lgmSent", label: "Envoi dans LGM", value: (o) => (o.lgmSent ? "Oui" : "Non") },
      { key: "callRequested", label: "Appeler", value: (o) => (o.callRequested ? "Oui" : "Non") },
      { key: "lgmMessagesSent", label: "Messages envoyés", value: (o) => o.lgmMessagesSent ?? "" },
      { key: "lgmEmailOpened", label: "Ouvertures email", value: (o) => o.lgmEmailOpened ?? "" },
      { key: "lgmConnectionSentAt", label: "Connexion envoyée", value: (o) => fmtDate(o.lgmConnectionSentAt) },
      { key: "lgmConnectionAcceptedAt", label: "Connexion acceptée", value: (o) => fmtDate(o.lgmConnectionAcceptedAt) },
      { key: "lgmMessage1SentAt", label: "Message 1 envoyé", value: (o) => fmtDate(o.lgmMessage1SentAt) },
      { key: "lgmRepliedAt", label: "Réponse reçue", value: (o) => fmtDate(o.lgmRepliedAt) },
      { key: "lgmReplyContent", label: "Contenu réponse", value: (o) => o.lgmReplyContent ?? "" },
    ];

    // Si le client fournit la liste des colonnes visibles, on n'exporte que celles-ci.
    const columnsParam = searchParams.get("columns");
    const visibleKeys = columnsParam ? new Set(columnsParam.split(",").filter(Boolean)) : null;

    const exportFixed = visibleKeys ? fixedColumns.filter((c) => visibleKeys.has(c.key)) : fixedColumns;
    const exportCustom = visibleKeys ? customFieldDefs.filter((f) => visibleKeys.has(f.id)) : customFieldDefs;

    const headers = [...exportFixed.map((c) => c.label), ...exportCustom.map((f) => f.label)];

    const rows = allOffers.map((offer) => {
      let customValues: Record<string, unknown> = {};
      try { customValues = JSON.parse(offer.customValues ?? "{}"); } catch {}

      const fixed = exportFixed.map((c) => c.value(offer));
      const custom = exportCustom.map((f) => customValues[f.name] ?? "");
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

  const [rawData, total, statsAll, statsToContact, statsDNC] = await retryAfterEnsuringRecruitingAgencyColumn(() =>
    Promise.all([
      prisma.jobOffer.findMany({ where, orderBy: { [sortBy]: sortDir }, skip: (page - 1) * limit, take: limit }),
      prisma.jobOffer.count({ where }),
      prisma.jobOffer.count({ where: { workspaceId } }),
      prisma.jobOffer.count({ where: { workspaceId, toContact: true } }),
      prisma.jobOffer.count({ where: { workspaceId, doNotContact: true } }),
    ])
  );

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
