"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [webhookToken, setWebhookToken] = useState("");
  const [lgmApiKey, setLgmApiKey] = useState("");
  const [lgmCampaignId, setLgmCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setWebhookToken(data.webhookToken ?? "");
        setLgmApiKey(data.lgmApiKey ?? "");
        setLgmCampaignId(data.lgmCampaignId ?? "");
      })
      .catch(() => {/* erreur silencieuse, loading reste false */})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lgmApiKey, lgmCampaignId }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function copyWebhook() {
    const url = `${window.location.origin}/api/webhook/${webhookToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="text-gray-500 text-sm">Chargement...</div>;

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/${webhookToken}`;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-dark">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Webhook Mantiks et configuration LGM</p>
      </div>

      {/* Webhook */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-brand-dark">Webhook Mantiks</h2>
        <p className="text-sm text-gray-600">
          Configurez cette URL dans votre compte Mantiks pour recevoir les offres et leads.
        </p>
        <div className="flex gap-2">
          <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-brand-dark overflow-x-auto">
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhook}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap text-brand-dark"
          >
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      </section>

      {/* LGM */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-brand-dark">La Growth Machine</h2>
        <p className="text-sm text-gray-600">
          Quand vous cochez <strong>CONTACTER</strong>, le lead est automatiquement ajouté à votre campagne LGM.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-dark mb-1">
              Clé API LGM
            </label>
            <input
              type="password"
              value={lgmApiKey}
              onChange={(e) => setLgmApiKey(e.target.value)}
              placeholder="Votre clé API La Growth Machine"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-dark mb-1">
              Nom d&apos;audience LGM
            </label>
            <input
              type="text"
              value={lgmCampaignId}
              onChange={(e) => setLgmCampaignId(e.target.value)}
              placeholder="Nom exact de l'audience cible"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-brand-pink text-brand-dark rounded-lg px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Sauvegarde..." : saved ? "Sauvegardé ✓" : "Sauvegarder"}
          </button>
        </form>
      </section>
    </div>
  );
}
