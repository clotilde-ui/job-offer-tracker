"use client";

import { useState } from "react";

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: string;
  formula?: string | null;
}

interface AddCustomFieldModalProps {
  onClose: () => void;
  onCreated: (field: CustomField) => void;
}

const FIELD_TYPES = [
  { value: "TEXT", label: "Texte" },
  { value: "NUMBER", label: "Nombre" },
  { value: "BOOLEAN", label: "Case à cocher" },
  { value: "DATE", label: "Date" },
  { value: "FORMULA", label: "Formule" },
  { value: "AI", label: "IA (généré par Claude)" },
];

const FORMULA_VARS = [
  "{title}", "{company}", "{offerLocation}", "{source}",
  "{leadFirstName}", "{leadLastName}", "{leadEmail}", "{leadJobTitle}", "{description}",
];

export function AddCustomFieldModal({ onClose, onCreated }: AddCustomFieldModalProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("TEXT");
  const [formula, setFormula] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, type, formula: formula || undefined }),
    });

    if (res.ok) {
      const field = await res.json();
      onCreated(field);
    } else {
      const data = await res.json();
      setError(data.error ?? "Erreur lors de la création");
    }
    setLoading(false);
  }

  const isFormulaType = type === "FORMULA";
  const isAIType = type === "AI";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4 text-brand-dark">Ajouter un champ personnalisé</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-dark mb-1">
              Nom du champ
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="Ex: Budget, Priorité..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-dark mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setFormula(""); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {isFormulaType && (
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Formule</label>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                required
                placeholder="Ex: {title} — {company}"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
              />
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Variables disponibles :</p>
                <div className="flex flex-wrap gap-1">
                  {FORMULA_VARS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormula((f) => f + v)}
                      className="text-xs bg-gray-100 hover:bg-brand-pink/20 text-brand-dark rounded px-1.5 py-0.5 font-mono transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isAIType && (
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Prompt IA</label>
              <textarea
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                required
                rows={3}
                placeholder="Ex: Ce poste est-il dans le secteur tech ? Réponds par oui ou non."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Claude analysera chaque offre et remplira ce champ. Cliquez sur ⚡ dans le tableau pour générer.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-brand-dark hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-pink text-brand-dark rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
