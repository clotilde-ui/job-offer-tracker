"use client";

import { useMemo, useState } from "react";

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: string;
}

interface ImportCsvModalProps {
  customFields: CustomField[];
  workspaceId?: string;
  onClose: () => void;
  onImported: (count: number) => void;
}

interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  group: "Offre" | "Entreprise" | "Lead" | "Statuts" | "Champs personnalisés";
}

const IMPORT_FIELDS: ImportField[] = [
  { key: "title", label: "Titre de l'offre", required: true, group: "Offre" },
  { key: "description", label: "Description", group: "Offre" },
  { key: "url", label: "URL de l'offre", group: "Offre" },
  { key: "offerLocation", label: "Localisation de l'offre", group: "Offre" },
  { key: "source", label: "Source", group: "Offre" },
  { key: "publishedAt", label: "Date de publication", group: "Offre" },
  { key: "company", label: "Entreprise", required: true, group: "Entreprise" },
  { key: "linkedinPage", label: "LinkedIn entreprise", group: "Entreprise" },
  { key: "website", label: "Site web", group: "Entreprise" },
  { key: "phone", label: "Téléphone entreprise", group: "Entreprise" },
  { key: "headquarters", label: "Siège social", group: "Entreprise" },
  { key: "leadCivility", label: "Civilité lead", group: "Lead" },
  { key: "leadFirstName", label: "Prénom lead", group: "Lead" },
  { key: "leadLastName", label: "Nom lead", group: "Lead" },
  { key: "leadEmail", label: "Email lead", group: "Lead" },
  { key: "leadJobTitle", label: "Métier lead", group: "Lead" },
  { key: "leadLinkedin", label: "LinkedIn lead", group: "Lead" },
  { key: "leadPhone", label: "Téléphone lead", group: "Lead" },
  { key: "toContact", label: "À contacter", group: "Statuts" },
  { key: "doNotContact", label: "Ne pas contacter", group: "Statuts" },
  { key: "recruitingAgency", label: "Cabinet recrutement", group: "Statuts" },
  { key: "callRequested", label: "Appel demandé", group: "Statuts" },
  { key: "phoneLookupRequested", label: "Chercher téléphone", group: "Statuts" },
  { key: "enrichedPhone", label: "Téléphone enrichi", group: "Statuts" },
];

function splitCsvLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(firstLine, separator).map((header) => header.trim()).filter(Boolean);

  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, separator);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cells[index] ?? "";
      return acc;
    }, {});
  });

  return { headers, rows };
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function guessColumn(headers: string[], labels: string[]): string {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeLabel(header) }));
  for (const label of labels) {
    const normalizedLabel = normalizeLabel(label);
    const exact = normalizedHeaders.find((item) => item.normalized === normalizedLabel);
    if (exact) return exact.header;
  }
  for (const label of labels) {
    const normalizedLabel = normalizeLabel(label);
    const partial = normalizedHeaders.find((item) => item.normalized.includes(normalizedLabel) || normalizedLabel.includes(item.normalized));
    if (partial) return partial.header;
  }
  return "";
}

const GUESS_LABELS: Record<string, string[]> = {
  title: ["titre", "titre offre", "offre", "job title", "job_offer_title"],
  description: ["description", "job_offer_description"],
  url: ["url", "url offre", "job_offer_url"],
  company: ["entreprise", "societe", "company", "company_name"],
  linkedinPage: ["linkedin entreprise", "company_linkedin"],
  website: ["site web", "website", "company_website"],
  phone: ["telephone entreprise", "company_phone"],
  headquarters: ["siege social", "hq_location"],
  offerLocation: ["localisation", "job_offer_location"],
  source: ["source", "job_offer_source"],
  publishedAt: ["date offre", "date publication", "job_creation_date"],
  leadCivility: ["civilite", "lead_civility"],
  leadFirstName: ["prenom", "prenom lead", "lead_first_name"],
  leadLastName: ["nom", "nom lead", "lead_last_name"],
  leadEmail: ["email", "email lead", "lead_email"],
  leadJobTitle: ["metier lead", "poste lead", "lead_job_title"],
  leadLinkedin: ["linkedin lead", "lead_linkedin"],
  leadPhone: ["telephone lead", "lead_phones"],
  enrichedPhone: ["telephone enrichi", "numero de telephone", "enriched_phone"],
};

export function ImportCsvModal({ customFields, workspaceId, onClose, onImported }: ImportCsvModalProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const customImportFields = useMemo<ImportField[]>(() => customFields.map((field) => ({
    key: field.name,
    label: field.label,
    group: "Champs personnalisés",
  })), [customFields]);

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setError("");
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setError("Le CSV ne contient pas d'en-têtes ou aucune ligne à importer.");
      setHeaders([]);
      setRows([]);
      return;
    }

    setHeaders(parsed.headers);
    setRows(parsed.rows);

    const nextMapping: Record<string, string> = {};
    for (const field of IMPORT_FIELDS) {
      nextMapping[field.key] = guessColumn(parsed.headers, GUESS_LABELS[field.key] ?? [field.label, field.key]);
    }
    setMapping(nextMapping);

    const nextCustomMapping: Record<string, string> = {};
    for (const field of customFields) {
      nextCustomMapping[field.name] = guessColumn(parsed.headers, [field.label, field.name]);
    }
    setCustomMapping(nextCustomMapping);
  }

  async function handleImport() {
    setError("");
    if (rows.length === 0) {
      setError("Ajoute d'abord un fichier CSV.");
      return;
    }
    setLoading(true);
    const params = workspaceId ? `?targetWorkspaceId=${workspaceId}` : "";
    const res = await fetch(`/api/job-offers/import-csv${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, mapping, customMapping }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur pendant l'import CSV.");
      return;
    }

    onImported(Number(data.imported ?? 0));
  }

  const groupedFields = ["Offre", "Entreprise", "Lead", "Statuts"] as const;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark">Importer un CSV</h2>
            <p className="text-sm text-gray-500 mt-1">
              Choisis un fichier, puis associe manuellement chaque colonne CSV aux champs du tableau.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-brand-dark text-xl" aria-label="Fermer">×</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 mb-5">
          <label className="block text-sm font-medium text-brand-dark mb-2">Fichier CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void handleFileChange(event.target.files?.[0])}
            className="block w-full text-sm text-gray-600 file:mr-4 file:border-0 file:bg-brand-pink file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-dark hover:file:opacity-90"
          />
          {fileName && (
            <p className="text-xs text-gray-500 mt-2">
              {fileName} — {rows.length} ligne{rows.length > 1 ? "s" : ""} détectée{rows.length > 1 ? "s" : ""}.
            </p>
          )}
        </div>

        {headers.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {groupedFields.map((group) => (
                <FieldGroup
                  key={group}
                  title={group}
                  fields={IMPORT_FIELDS.filter((field) => field.group === group)}
                  headers={headers}
                  mapping={mapping}
                  onChange={(field, column) => setMapping((prev) => ({ ...prev, [field]: column }))}
                />
              ))}

              {customImportFields.length > 0 && (
                <FieldGroup
                  title="Champs personnalisés"
                  fields={customImportFields}
                  headers={headers}
                  mapping={customMapping}
                  onChange={(field, column) => setCustomMapping((prev) => ({ ...prev, [field]: column }))}
                />
              )}
            </div>

            <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-brand-dark">Aperçu des 3 premières lignes</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {headers.map((header) => (
                        <th key={header} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        {headers.map((header) => (
                          <td key={header} className="px-3 py-2 text-gray-600 max-w-[220px] truncate">{row[header] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 text-brand-dark hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={() => void handleImport()}
            disabled={loading || rows.length === 0}
            className="px-4 py-2 text-sm bg-brand-pink text-brand-dark font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Import…" : `Importer ${rows.length || ""} ligne${rows.length > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({
  title,
  fields,
  headers,
  mapping,
  onChange,
}: {
  title: string;
  fields: ImportField[];
  headers: string[];
  mapping: Record<string, string>;
  onChange: (field: string, column: string) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-brand-dark mb-3">{title}</h3>
      <div className="space-y-2">
        {fields.map((field) => (
          <label key={field.key} className="grid grid-cols-[150px_1fr] gap-2 items-center text-sm">
            <span className="text-gray-600">
              {field.label}{field.required && <span className="text-red-500"> *</span>}
            </span>
            <select
              value={mapping[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-sm text-brand-dark bg-white focus:outline-none focus:ring-1 focus:ring-brand-pink"
            >
              <option value="">Ne pas importer</option>
              {headers.map((header) => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
