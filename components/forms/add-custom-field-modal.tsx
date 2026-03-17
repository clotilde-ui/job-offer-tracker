"use client";

import { useState } from "react";

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: string;
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
];

export function AddCustomFieldModal({ onClose, onCreated }: AddCustomFieldModalProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("TEXT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, type }),
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
            <label className="block text-sm font-medium text-brand-dark mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

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
