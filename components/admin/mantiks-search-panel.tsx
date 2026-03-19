"use client";

import { useState } from "react";

const JOB_BOARDS = [
  { value: "", label: "Tous les job boards" },
  { value: "indeed", label: "Indeed" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "wttj", label: "Welcome to the Jungle" },
  { value: "glassdoor", label: "Glassdoor" },
];

const AGE_OPTIONS = [
  { value: 7, label: "7 derniers jours" },
  { value: 14, label: "14 derniers jours" },
  { value: 30, label: "30 derniers jours" },
  { value: 60, label: "60 derniers jours" },
  { value: 90, label: "90 derniers jours" },
];

interface MantikJob {
  title: string;
  location?: string;
  job_board?: string;
  url?: string;
  published_at?: string;
}

interface MantikCompany {
  name: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  employee_count?: string | number;
  jobs: MantikJob[];
}

interface MantikResult {
  companies: MantikCompany[];
  next_offset?: string | null;
  total?: number;
}

// Reusable tag input
function TagInput({
  values,
  onAdd,
  onRemove,
  placeholder,
  numeric,
}: {
  values: (string | number)[];
  onAdd: (v: string) => void;
  onRemove: (v: string | number) => void;
  placeholder: string;
  numeric?: boolean;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type={numeric ? "number" : "text"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 text-brand-dark whitespace-nowrap"
        >
          +
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 bg-brand-dark text-white px-2 py-0.5 text-xs">
              {v}
              <button type="button" onClick={() => onRemove(v)} className="hover:text-brand-pink ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MantikSearchPanel({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);

  // --- Job filters ---
  const [jobAge, setJobAge] = useState(30);
  const [locationIds, setLocationIds] = useState<number[]>([]);

  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [jobTitleIncludeAll, setJobTitleIncludeAll] = useState(false);
  const [jobTitlesExcluded, setJobTitlesExcluded] = useState<string[]>([]);

  const [jobDescriptions, setJobDescriptions] = useState<string[]>([]);
  const [jobDescriptionIncludeAll, setJobDescriptionIncludeAll] = useState(false);
  const [jobDescriptionsExcluded, setJobDescriptionsExcluded] = useState<string[]>([]);

  const [jobBoard, setJobBoard] = useState("");

  const [nbMinJobs, setNbMinJobs] = useState("");
  const [nbMaxJobs, setNbMaxJobs] = useState("");

  // --- Company filters ---
  const [minCompanySize, setMinCompanySize] = useState("");
  const [maxCompanySize, setMaxCompanySize] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState<string[]>([]);
  const [companyIndustryExcluded, setCompanyIndustryExcluded] = useState<string[]>(["recruiting", "consulting"]);
  const [companyFunding, setCompanyFunding] = useState(false);

  // --- Pagination ---
  const [limit, setLimit] = useState("10");

  // --- Results ---
  const [results, setResults] = useState<MantikResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  function buildBody(offset?: string) {
    return {
      job_age_in_days: jobAge,
      job_location_ids: locationIds,
      job_title: jobTitles,
      job_title_include_all: jobTitleIncludeAll,
      job_title_excluded: jobTitlesExcluded,
      job_description: jobDescriptions,
      job_description_include_all: jobDescriptionIncludeAll,
      job_description_excluded: jobDescriptionsExcluded,
      job_board: jobBoard || undefined,
      nb_min_job_posted: nbMinJobs ? parseInt(nbMinJobs) : undefined,
      nb_max_job_posted: nbMaxJobs ? parseInt(nbMaxJobs) : undefined,
      min_company_size: minCompanySize ? parseInt(minCompanySize) : undefined,
      max_company_size: maxCompanySize ? parseInt(maxCompanySize) : undefined,
      company_industry: companyIndustry,
      company_industry_excluded: companyIndustryExcluded,
      company_funding: companyFunding || undefined,
      limit: limit ? parseInt(limit) : 10,
      offset,
    };
  }

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setResults(null);
    setNextOffset(null);
    try {
      const res = await fetch(`/api/mantiks/search?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); return; }
      setResults(data);
      setNextOffset(data.next_offset ?? null);
    } catch { setError("Erreur réseau"); }
    finally { setLoading(false); }
  }

  async function handleLoadMore() {
    if (!nextOffset) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/mantiks/search?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(nextOffset)),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); return; }
      setResults((prev) => ({ ...data, companies: [...(prev?.companies ?? []), ...(data.companies ?? [])] }));
      setNextOffset(data.next_offset ?? null);
    } catch { setError("Erreur réseau"); }
    finally { setLoadingMore(false); }
  }

  return (
    <div className="border border-brand-pink/40 bg-brand-pink/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-brand-dark hover:bg-brand-pink/10 transition-colors"
      >
        <span>🔍 Recherche Mantiks</span>
        <span className="text-gray-400 text-xs">{open ? "▲ Réduire" : "▼ Ouvrir"}</span>
      </button>

      {open && (
        <div className="border-t border-brand-pink/30 p-4 space-y-6">

          {/* ── OFFRES ─────────────────────────────────────────── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Offres d&apos;emploi</legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Age */}
              <div>
                <label className="block text-xs font-medium text-brand-dark mb-1">
                  Ancienneté <span className="text-red-400">*</span>
                </label>
                <select
                  value={jobAge}
                  onChange={(e) => setJobAge(Number(e.target.value))}
                  className="w-full border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
                >
                  {AGE_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              {/* Job board */}
              <div>
                <label className="block text-xs font-medium text-brand-dark mb-1">Job board</label>
                <select
                  value={jobBoard}
                  onChange={(e) => setJobBoard(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
                >
                  {JOB_BOARDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>

              {/* Nb jobs min/max */}
              <div>
                <label className="block text-xs font-medium text-brand-dark mb-1">Nb offres min par entreprise</label>
                <input
                  type="number" min={1} value={nbMinJobs}
                  onChange={(e) => setNbMinJobs(e.target.value)}
                  placeholder="ex: 2"
                  className="w-full border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-dark mb-1">Nb offres max par entreprise</label>
                <input
                  type="number" min={1} value={nbMaxJobs}
                  onChange={(e) => setNbMaxJobs(e.target.value)}
                  placeholder="ex: 10"
                  className="w-full border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
              </div>
            </div>

            {/* Location IDs */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">
                Localisations <span className="text-red-400">*</span>{" "}
                <span className="text-gray-400 font-normal">(IDs Mantiks — ex: 2988507 = Paris)</span>
              </label>
              <TagInput
                values={locationIds}
                onAdd={(v) => { const n = parseInt(v); if (!isNaN(n) && !locationIds.includes(n)) setLocationIds((p) => [...p, n]); }}
                onRemove={(v) => setLocationIds((p) => p.filter((x) => x !== v))}
                placeholder="ex: 2988507"
                numeric
              />
            </div>

            {/* Job title */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">Mots-clés dans le titre</label>
              <TagInput
                values={jobTitles}
                onAdd={(v) => { if (!jobTitles.includes(v)) setJobTitles((p) => [...p, v]); }}
                onRemove={(v) => setJobTitles((p) => p.filter((x) => x !== v))}
                placeholder="ex: sales, account manager..."
              />
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={jobTitleIncludeAll} onChange={(e) => setJobTitleIncludeAll(e.target.checked)} className="accent-brand-dark" />
                Logique AND (tous les mots-clés requis)
              </label>
            </div>

            {/* Job title excluded */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">Mots-clés à exclure du titre</label>
              <TagInput
                values={jobTitlesExcluded}
                onAdd={(v) => { if (!jobTitlesExcluded.includes(v)) setJobTitlesExcluded((p) => [...p, v]); }}
                onRemove={(v) => setJobTitlesExcluded((p) => p.filter((x) => x !== v))}
                placeholder="ex: intern, junior..."
              />
            </div>

            {/* Job description */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">Mots-clés dans la description</label>
              <TagInput
                values={jobDescriptions}
                onAdd={(v) => { if (!jobDescriptions.includes(v)) setJobDescriptions((p) => [...p, v]); }}
                onRemove={(v) => setJobDescriptions((p) => p.filter((x) => x !== v))}
                placeholder="ex: CRM, Salesforce..."
              />
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={jobDescriptionIncludeAll} onChange={(e) => setJobDescriptionIncludeAll(e.target.checked)} className="accent-brand-dark" />
                Logique AND (tous les mots-clés requis)
              </label>
            </div>

            {/* Job description excluded */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">Mots-clés à exclure de la description</label>
              <TagInput
                values={jobDescriptionsExcluded}
                onAdd={(v) => { if (!jobDescriptionsExcluded.includes(v)) setJobDescriptionsExcluded((p) => [...p, v]); }}
                onRemove={(v) => setJobDescriptionsExcluded((p) => p.filter((x) => x !== v))}
                placeholder="ex: CDI, stage..."
              />
            </div>
          </fieldset>

          {/* ── ENTREPRISES ────────────────────────────────────── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Entreprises</legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-dark mb-1">Taille min (employés)</label>
                <input
                  type="number" min={1} value={minCompanySize}
                  onChange={(e) => setMinCompanySize(e.target.value)}
                  placeholder="ex: 10"
                  className="w-full border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-dark mb-1">Taille max (employés)</label>
                <input
                  type="number" min={1} value={maxCompanySize}
                  onChange={(e) => setMaxCompanySize(e.target.value)}
                  placeholder="ex: 500"
                  className="w-full border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
              </div>
            </div>

            {/* Company industry */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">Secteurs d&apos;activité inclus</label>
              <TagInput
                values={companyIndustry}
                onAdd={(v) => { if (!companyIndustry.includes(v)) setCompanyIndustry((p) => [...p, v]); }}
                onRemove={(v) => setCompanyIndustry((p) => p.filter((x) => x !== v))}
                placeholder="ex: software, retail..."
              />
            </div>

            {/* Company industry excluded */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">
                Secteurs exclus{" "}
                <span className="text-gray-400 font-normal">(défaut: recruiting, consulting)</span>
              </label>
              <TagInput
                values={companyIndustryExcluded}
                onAdd={(v) => { if (!companyIndustryExcluded.includes(v)) setCompanyIndustryExcluded((p) => [...p, v]); }}
                onRemove={(v) => setCompanyIndustryExcluded((p) => p.filter((x) => x !== v))}
                placeholder="ex: recruiting..."
              />
            </div>

            {/* Funding */}
            <label className="flex items-center gap-2 text-sm text-brand-dark cursor-pointer select-none">
              <input type="checkbox" checked={companyFunding} onChange={(e) => setCompanyFunding(e.target.checked)} className="accent-brand-dark" />
              Entreprises avec levée de fonds uniquement
            </label>
          </fieldset>

          {/* ── RÉSULTATS ──────────────────────────────────────── */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Résultats</legend>
            <div className="flex items-center gap-3">
              <div className="w-28">
                <label className="block text-xs font-medium text-brand-dark mb-1">Limite</label>
                <input
                  type="number" min={1} max={500} value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-1.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
              </div>
              <div className="flex-1 flex items-end">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full bg-brand-dark text-white px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? "Recherche en cours..." : "Lancer la recherche"}
                </button>
              </div>
            </div>
          </fieldset>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>
          )}

          {/* Results */}
          {results && (
            <>
              <p className="text-xs text-gray-500">
                {results.companies?.length ?? 0} entreprise(s) affichée(s)
                {results.total ? ` sur ${results.total}` : ""}
              </p>

              {results.companies?.length === 0 && (
                <p className="text-sm text-gray-500">Aucun résultat pour ces critères.</p>
              )}

              <div className="space-y-3">
                {results.companies?.map((company, ci) => (
                  <div key={ci} className="border border-gray-200 bg-white">
                    <div className="flex items-start justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-sm text-brand-dark">{company.name}</p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {company.industry && <span className="text-xs text-gray-500">{company.industry}</span>}
                          {company.employee_count && <span className="text-xs text-gray-500">{company.employee_count} employés</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-3">
                        {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-dark underline hover:no-underline">Site</a>}
                        {company.linkedin && <a href={company.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-dark underline hover:no-underline">LinkedIn</a>}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {company.jobs?.map((job, ji) => (
                        <div key={ji} className="px-4 py-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-brand-dark truncate">{job.title}</p>
                            <div className="flex flex-wrap gap-x-2 mt-0.5">
                              {job.location && <span className="text-xs text-gray-400">{job.location}</span>}
                              {job.job_board && <span className="text-xs text-gray-400 capitalize">{job.job_board}</span>}
                              {job.published_at && <span className="text-xs text-gray-400">{new Date(job.published_at).toLocaleDateString("fr-FR")}</span>}
                            </div>
                          </div>
                          {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-dark underline hover:no-underline shrink-0">Voir</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {nextOffset && (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2 text-sm text-brand-dark border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? "Chargement..." : "Charger plus de résultats"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
