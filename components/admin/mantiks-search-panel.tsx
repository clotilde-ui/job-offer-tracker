"use client";

import { useState } from "react";

const JOB_BOARDS = [
  { value: "", label: "Tous les job boards" },
  { value: "indeed", label: "Indeed" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "welcome_to_the_jungle", label: "Welcome to the Jungle" },
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

interface MantikSearchFilters {
  job_title: string[];
  job_board: string;
  job_age_in_days: number;
  job_location_ids: number[];
}

interface Props {
  workspaceId: string;
}

export function MantikSearchPanel({ workspaceId }: Props) {
  const [open, setOpen] = useState(false);

  // Filters
  const [jobTitleInput, setJobTitleInput] = useState("");
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [jobBoard, setJobBoard] = useState("");
  const [jobAge, setJobAge] = useState(30);
  const [locationInput, setLocationInput] = useState("");
  const [locationIds, setLocationIds] = useState<number[]>([]);

  // Results
  const [results, setResults] = useState<MantikResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  function addJobTitle() {
    const trimmed = jobTitleInput.trim();
    if (!trimmed || jobTitles.includes(trimmed)) return;
    setJobTitles((prev) => [...prev, trimmed]);
    setJobTitleInput("");
  }

  function removeJobTitle(t: string) {
    setJobTitles((prev) => prev.filter((x) => x !== t));
  }

  function addLocationId() {
    const num = parseInt(locationInput.trim(), 10);
    if (isNaN(num) || locationIds.includes(num)) return;
    setLocationIds((prev) => [...prev, num]);
    setLocationInput("");
  }

  function removeLocationId(id: number) {
    setLocationIds((prev) => prev.filter((x) => x !== id));
  }

  function buildFilters(): MantikSearchFilters {
    return {
      job_title: jobTitles,
      job_board: jobBoard,
      job_age_in_days: jobAge,
      job_location_ids: locationIds,
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
        body: JSON.stringify(buildFilters()),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        return;
      }
      setResults(data);
      setNextOffset(data.next_offset ?? null);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (!nextOffset) return;
    setLoadingMore(true);

    try {
      const res = await fetch(`/api/mantiks/search?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildFilters(), offset: nextOffset }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        return;
      }
      setResults((prev) => ({
        ...data,
        companies: [...(prev?.companies ?? []), ...(data.companies ?? [])],
      }));
      setNextOffset(data.next_offset ?? null);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="border border-brand-pink/40 bg-brand-pink/5">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-brand-dark hover:bg-brand-pink/10 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">🔍</span>
          Recherche Mantiks
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲ Réduire" : "▼ Ouvrir"}</span>
      </button>

      {open && (
        <div className="border-t border-brand-pink/30 p-4 space-y-5">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Job title keywords */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-brand-dark mb-1">
                Mots-clés du titre de poste
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={jobTitleInput}
                  onChange={(e) => setJobTitleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addJobTitle(); } }}
                  placeholder="ex: sales, business developer..."
                  className="flex-1 border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
                <button
                  type="button"
                  onClick={addJobTitle}
                  className="px-3 py-2 text-sm border border-gray-300 hover:bg-gray-50 text-brand-dark whitespace-nowrap"
                >
                  + Ajouter
                </button>
              </div>
              {jobTitles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {jobTitles.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-brand-dark text-white px-2 py-0.5 text-xs"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeJobTitle(t)}
                        className="hover:text-brand-pink ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Job board */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">Job board</label>
              <select
                value={jobBoard}
                onChange={(e) => setJobBoard(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
              >
                {JOB_BOARDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">
                Ancienneté de l&apos;offre
              </label>
              <select
                value={jobAge}
                onChange={(e) => setJobAge(Number(e.target.value))}
                className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
              >
                {AGE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Location IDs */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-brand-dark mb-1">
                IDs de localisation Mantiks{" "}
                <span className="text-gray-400 font-normal">
                  (ex: 5128581 = New York, 2988507 = Paris)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocationId(); } }}
                  placeholder="ex: 2988507"
                  className="flex-1 border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
                <button
                  type="button"
                  onClick={addLocationId}
                  className="px-3 py-2 text-sm border border-gray-300 hover:bg-gray-50 text-brand-dark whitespace-nowrap"
                >
                  + Ajouter
                </button>
              </div>
              {locationIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {locationIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 bg-gray-200 text-brand-dark px-2 py-0.5 text-xs"
                    >
                      {id}
                      <button
                        type="button"
                        onClick={() => removeLocationId(id)}
                        className="hover:text-red-400 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="bg-brand-dark text-white px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Recherche en cours..." : "Lancer la recherche"}
            </button>
            {results && (
              <span className="text-xs text-gray-500">
                {results.companies?.length ?? 0} entreprise(s) trouvée(s)
                {results.total ? ` sur ${results.total}` : ""}
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </div>
          )}

          {/* Results */}
          {results && results.companies && results.companies.length > 0 && (
            <div className="space-y-3 mt-2">
              {results.companies.map((company, ci) => (
                <div key={ci} className="border border-gray-200 bg-white">
                  {/* Company header */}
                  <div className="flex items-start justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div>
                      <p className="font-medium text-sm text-brand-dark">{company.name}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {company.industry && (
                          <span className="text-xs text-gray-500">{company.industry}</span>
                        )}
                        {company.employee_count && (
                          <span className="text-xs text-gray-500">{company.employee_count} employés</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-dark underline hover:no-underline"
                        >
                          Site
                        </a>
                      )}
                      {company.linkedin && (
                        <a
                          href={company.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-dark underline hover:no-underline"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Jobs list */}
                  <div className="divide-y divide-gray-100">
                    {company.jobs?.map((job, ji) => (
                      <div key={ji} className="px-4 py-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-brand-dark truncate">{job.title}</p>
                          <div className="flex flex-wrap gap-x-2 mt-0.5">
                            {job.location && (
                              <span className="text-xs text-gray-400">{job.location}</span>
                            )}
                            {job.job_board && (
                              <span className="text-xs text-gray-400 capitalize">{job.job_board}</span>
                            )}
                            {job.published_at && (
                              <span className="text-xs text-gray-400">
                                {new Date(job.published_at).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                        </div>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-dark underline hover:no-underline shrink-0"
                          >
                            Voir l&apos;offre
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more */}
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
          )}

          {results && results.companies?.length === 0 && (
            <p className="text-sm text-gray-500">Aucun résultat pour ces critères.</p>
          )}
        </div>
      )}
    </div>
  );
}
