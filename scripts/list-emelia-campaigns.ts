#!/usr/bin/env tsx

type CampaignRow = { id: string; name: string };

const endpoint = process.env.EMELIA_GRAPHQL_URL || "https://graphql.emelia.io/graphql";
const apiKey = process.env.EMELIA_API_KEY || process.env.EMELI_API_KEY;

function printUsage() {
  console.log(`
Usage:
  EMELIA_API_KEY="..." npm run emelia:list-campaigns

Optional:
  EMELIA_GRAPHQL_URL="https://graphql.emelia.io/graphql"

Tips:
  - You can also use EMELI_API_KEY (workspace env naming).
  - This script tries several common campaign queries and prints name + _id.
`);
}

function pickCampaignsFromUnknown(value: unknown): CampaignRow[] {
  if (!Array.isArray(value)) return [];

  const rows: CampaignRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const rawId = obj._id ?? obj.id;
    const rawName = obj.name ?? obj.title;
    if ((typeof rawId === "string" || typeof rawId === "number") && typeof rawName === "string") {
      rows.push({ id: String(rawId), name: rawName });
    }
  }
  return rows;
}

async function runQuery(query: string): Promise<CampaignRow[]> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey as string,
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Réponse non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  }

  const payload = json as { data?: Record<string, unknown>; errors?: Array<{ message?: string }> };
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error(payload.errors.map((e) => e?.message || "Erreur GraphQL inconnue").join(" | "));
  }

  const data = payload.data ?? {};
  for (const key of Object.keys(data)) {
    const rows = pickCampaignsFromUnknown(data[key]);
    if (rows.length > 0) return rows;
  }

  return [];
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (!apiKey) {
    console.error("❌ EMELIA_API_KEY (ou EMELI_API_KEY) manquante.");
    printUsage();
    process.exit(1);
  }

  const candidateQueries = [
    "query { campaigns { _id name } }",
    "query { campaigns { id name } }",
    "query { getCampaigns { _id name } }",
    "query { getCampaigns { id name } }",
    "query { campaignList { _id name } }",
    "query { campaignList { id name } }",
  ];

  let lastError: string | null = null;
  for (const query of candidateQueries) {
    try {
      const campaigns = await runQuery(query);
      if (campaigns.length === 0) continue;

      console.log(`✅ ${campaigns.length} campagne(s) trouvée(s):\n`);
      for (const c of campaigns) {
        console.log(`- ${c.name} | _id: ${c.id}`);
      }
      process.exit(0);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  console.error("❌ Impossible de lister les campagnes avec les requêtes testées.");
  if (lastError) console.error(`Dernière erreur: ${lastError}`);
  process.exit(1);
}

void main();
