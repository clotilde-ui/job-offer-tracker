"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { AddCustomFieldModal } from "@/components/forms/add-custom-field-modal";

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: string;
}

interface JobOffer {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  company: string;
  linkedinPage: string | null;
  website: string | null;
  phone: string | null;
  headquarters: string | null;
  offerLocation: string | null;
  source: string | null;
  publishedAt: string | null;
  receivedAt: string;
  leadCivility: string | null;
  leadFirstName: string | null;
  leadLastName: string | null;
  leadEmail: string | null;
  leadJobTitle: string | null;
  leadLinkedin: string | null;
  leadPhone: string | null;
  toContact: boolean;
  lgmSent: boolean;
  customValues: Record<string, unknown>;
}

interface OffersTableProps {
  customFields: CustomField[];
}

export function OffersTable({ customFields: initialCustomFields }: OffersTableProps) {
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);
  const [showAddField, setShowAddField] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const LIMIT = 50;

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/job-offers?${params}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json = await res.json();
      setOffers(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setOffers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  async function toggleContact(id: string, current: boolean) {
    const res = await fetch(`/api/job-offers/${id}/contact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toContact: !current }),
    });
    if (res.ok) {
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, toContact: !current } : o))
      );
    }
  }

  async function updateCustomValue(offerId: string, fieldName: string, value: unknown) {
    await fetch(`/api/job-offers/${offerId}/custom-values`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldName, value }),
    });
    setOffers((prev) =>
      prev.map((o) =>
        o.id === offerId
          ? { ...o, customValues: { ...o.customValues, [fieldName]: value } }
          : o
      )
    );
  }

  async function deleteCustomField(fieldId: string) {
    if (!confirm("Supprimer ce champ ? Les données associées seront perdues.")) return;
    const res = await fetch(`/api/custom-fields/${fieldId}`, { method: "DELETE" });
    if (res.ok) {
      setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const totalPages = Math.ceil(total / LIMIT);

  const fixedColumns = [
    { key: "title", label: "Offre d'emploi" },
    { key: "company", label: "Entreprise" },
    { key: "offerLocation", label: "Localisation offre" },
    { key: "source", label: "Source" },
    { key: "publishedAt", label: "Date création offre" },
    { key: "leadName", label: "Lead" },
    { key: "leadEmail", label: "Email lead" },
    { key: "leadJobTitle", label: "Métier lead" },
    { key: "toContact", label: "CONTACTER" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher offre, entreprise, lead..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 text-brand-dark bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
          <button
            type="submit"
            className="bg-brand-pink text-brand-dark px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Rechercher
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="text-sm text-gray-500 hover:text-brand-dark px-2"
            >
              Réinitialiser
            </button>
          )}
        </form>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {total} offre{total > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowAddField(true)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-white text-brand-dark flex items-center gap-1 transition-colors"
          >
            + Champ personnalisé
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-brand-dark border-b border-gray-200">
              {fixedColumns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-3 font-medium text-white whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              {customFields.map((field) => (
                <th
                  key={field.id}
                  className="text-left px-3 py-3 font-medium text-white whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    {field.label}
                    <button
                      onClick={() => deleteCustomField(field.id)}
                      className="text-white/40 hover:text-red-400 ml-1 text-xs"
                      title="Supprimer ce champ"
                    >
                      ✕
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={fixedColumns.length + customFields.length}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  Chargement...
                </td>
              </tr>
            ) : offers.length === 0 ? (
              <tr>
                <td
                  colSpan={fixedColumns.length + customFields.length}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  Aucune offre. Les données arrivent via votre webhook Mantiks.
                </td>
              </tr>
            ) : (
              offers.map((offer) => (
                <>
                  <tr
                    key={offer.id}
                    className={cn(
                      "border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer",
                      offer.toContact && "bg-[#26B743]/10"
                    )}
                    onClick={() =>
                      setExpandedRow(expandedRow === offer.id ? null : offer.id)
                    }
                  >
                    {/* Offre */}
                    <td className="px-3 py-3 max-w-[220px]">
                      <div className="font-medium text-brand-dark truncate">
                        {offer.title}
                      </div>
                      {offer.url && (
                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-brand-dark underline hover:text-brand-pink"
                        >
                          Voir l&apos;offre
                        </a>
                      )}
                    </td>

                    {/* Entreprise */}
                    <td className="px-3 py-3 max-w-[180px]">
                      <div className="font-medium truncate text-brand-dark">{offer.company}</div>
                      <div className="flex gap-2 mt-0.5">
                        {offer.linkedinPage && (
                          <a
                            href={offer.linkedinPage}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-brand-dark underline hover:text-brand-pink"
                          >
                            LinkedIn
                          </a>
                        )}
                        {offer.website && (
                          <a
                            href={offer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-brand-dark underline hover:text-brand-pink"
                          >
                            Site
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Localisation offre */}
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {offer.offerLocation ?? "—"}
                    </td>

                    {/* Source */}
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {offer.source ?? "—"}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {offer.publishedAt
                        ? new Date(offer.publishedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>

                    {/* Lead */}
                    <td className="px-3 py-3 max-w-[160px]">
                      {offer.leadFirstName || offer.leadLastName ? (
                        <div>
                          <div className="font-medium truncate text-brand-dark">
                            {[offer.leadCivility, offer.leadFirstName, offer.leadLastName]
                              .filter(Boolean)
                              .join(" ")}
                          </div>
                          {offer.leadLinkedin && (
                            <a
                              href={offer.leadLinkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-brand-dark underline hover:text-brand-pink"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Email lead */}
                    <td className="px-3 py-3 text-gray-600">
                      {offer.leadEmail ? (
                        <a
                          href={`mailto:${offer.leadEmail}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline hover:text-brand-pink"
                        >
                          {offer.leadEmail}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Métier lead */}
                    <td className="px-3 py-3 text-gray-600 max-w-[150px] truncate">
                      {offer.leadJobTitle ?? "—"}
                    </td>

                    {/* CONTACTER */}
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={offer.toContact}
                          onChange={() => toggleContact(offer.id, offer.toContact)}
                          className="w-4 h-4 cursor-pointer"
                          style={{ accentColor: "#FFBEFA" }}
                        />
                        {offer.lgmSent && (
                          <span className="text-xs text-brand-green font-medium">
                            LGM ✓
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Champs personnalisés */}
                    {customFields.map((field) => (
                      <td
                        key={field.id}
                        className="px-3 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CustomFieldCell
                          field={field}
                          value={offer.customValues?.[field.name]}
                          onChange={(val) =>
                            updateCustomValue(offer.id, field.name, val)
                          }
                        />
                      </td>
                    ))}
                  </tr>

                  {/* Ligne étendue — détails */}
                  {expandedRow === offer.id && (
                    <tr key={`${offer.id}-expanded`} className="bg-[#FFBEFA]/10 border-b border-gray-200">
                      <td
                        colSpan={fixedColumns.length + customFields.length}
                        className="px-6 py-4"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                          {offer.description && (
                            <div className="col-span-full">
                              <span className="font-medium text-brand-dark">Description : </span>
                              <p className="text-gray-600 mt-1 whitespace-pre-wrap">{offer.description}</p>
                            </div>
                          )}
                          <Detail label="Siège entreprise" value={offer.headquarters} />
                          <Detail label="Téléphone entreprise" value={offer.phone} />
                          <Detail label="Téléphone lead" value={offer.leadPhone} />
                          <Detail label="Reçu le" value={new Date(offer.receivedAt).toLocaleString("fr-FR")} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white text-brand-dark transition-colors"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white text-brand-dark transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Modal ajout champ */}
      {showAddField && (
        <AddCustomFieldModal
          onClose={() => setShowAddField(false)}
          onCreated={(field) => {
            setCustomFields((prev) => [...prev, field]);
            setShowAddField(false);
          }}
        />
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="font-medium text-brand-dark">{label} : </span>
      <span className="text-gray-600">{value}</span>
    </div>
  );
}

function CustomFieldCell({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (field.type === "BOOLEAN") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 cursor-pointer"
        style={{ accentColor: "#FFBEFA" }}
      />
    );
  }

  if (field.type === "NUMBER") {
    return (
      <input
        type="number"
        defaultValue={value != null ? String(value) : ""}
        onBlur={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="border border-gray-300 rounded px-2 py-1 text-sm w-24 text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-pink"
      />
    );
  }

  return (
    <input
      type={field.type === "DATE" ? "date" : "text"}
      defaultValue={value != null ? String(value) : ""}
      onBlur={(e) => onChange(e.target.value || null)}
      className="border border-gray-300 rounded px-2 py-1 text-sm w-32 text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-pink"
    />
  );
}
