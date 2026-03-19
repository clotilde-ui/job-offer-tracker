import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/workspace-access";

function appendArray(params: URLSearchParams, key: string, values: unknown) {
  if (Array.isArray(values)) {
    values.forEach((v) => { if (v !== "" && v != null) params.append(key, String(v)); });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const workspaceId = resolveWorkspaceId(session, req);
  if (!workspaceId) return NextResponse.json({ error: "Workspace requis" }, { status: 400 });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { mantiksApiKey: true },
  });

  if (!workspace?.mantiksApiKey) {
    return NextResponse.json({ error: "Clé API Mantiks non configurée. Rendez-vous dans les Paramètres." }, { status: 400 });
  }

  const body = await req.json();

  const params = new URLSearchParams();

  // Required
  if (body.job_age_in_days != null) params.set("job_age_in_days", String(body.job_age_in_days));
  appendArray(params, "job_location_ids", body.job_location_ids);

  // Job title filters
  appendArray(params, "job_title", body.job_title);
  if (body.job_title_include_all === true) params.set("job_title_include_all", "true");
  appendArray(params, "job_title_excluded", body.job_title_excluded);

  // Job description filters
  appendArray(params, "job_description", body.job_description);
  if (body.job_description_include_all === true) params.set("job_description_include_all", "true");
  appendArray(params, "job_description_excluded", body.job_description_excluded);

  // Job board
  if (body.job_board) params.set("job_board", body.job_board);

  // Job count filters
  if (body.nb_min_job_posted != null) params.set("nb_min_job_posted", String(body.nb_min_job_posted));
  if (body.nb_max_job_posted != null) params.set("nb_max_job_posted", String(body.nb_max_job_posted));

  // Company size filters
  if (body.min_company_size != null) params.set("min_company_size", String(body.min_company_size));
  if (body.max_company_size != null) params.set("max_company_size", String(body.max_company_size));

  // Company industry filters
  appendArray(params, "company_industry", body.company_industry);
  appendArray(params, "company_industry_excluded", body.company_industry_excluded);

  // Company funding
  if (body.company_funding === true) params.set("company_funding", "true");

  // Pagination & limit
  if (body.limit != null) params.set("limit", String(body.limit));
  if (body.offset) params.set("offset", String(body.offset));

  const url = `https://api.mantiks.io/company/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: { "x-api-key": workspace.mantiksApiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: `Erreur Mantiks API (${response.status})`, details: text },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
