"use client";

import { useEffect, useState } from "react";

const AI_PROVIDERS = [
  {
    id: "claude",
    name: "Claude",
    company: "Anthropic",
    model: "claude-haiku-4-5",
    placeholder: "sk-ant-api03-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    name: "Gemini",
    company: "Google",
    model: "gemini-2.0-flash",
    placeholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "groq",
    name: "Groq",
    company: "Groq",
    model: "llama-3.3-70b",
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
  },
  {
    id: "openai",
    name: "OpenAI",
    company: "OpenAI",
    model: "gpt-4o-mini",
    placeholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
] as const;

type ProviderId = (typeof AI_PROVIDERS)[number]["id"];

interface User {
  id: string;
  name: string;
  email: string;
}

export function SettingsForm({ users }: { users: User[] }) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [webhookToken, setWebhookToken] = useState("");
  const [lgmApiKey, setLgmApiKey] = useState("");
  const [lgmCampaignId, setLgmCampaignId] = useState("");
  const [aiProvider, setAiProvider] = useState<ProviderId>("claude");
  const [aiKeys, setAiKeys] = useState<Record<ProviderId, string>>({
    claude: "",
    gemini: "",
    groq: "",
    openai: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedUserId) return;
    setLoading(true);
    fetch(`/api/settings?userId=${selectedUserId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setWebhookToken(data.webhookToken ?? "");
        setLgmApiKey(data.lgmApiKey ?? "");
        setLgmCampaignId(data.lgmCampaignId ?? "");
        if (data.aiProvider) setAiProvider(data.aiProvider);
        setAiKeys({
          claude: data.claudeApiKey ?? "",
          gemini: data.geminiApiKey ?? "",
          groq: data.groqApiKey ?? "",
          openai: data.openaiApiKey ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/settings?userId=${selectedUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lgmApiKey,
        lgmCampaignId,
        aiProvider,
        claudeApiKey: aiKeys.claude,
        geminiApiKey: aiKeys.gemini,
        groqApiKey: aiKeys.groq,
        openaiApiKey: aiKeys.openai,
      }),
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

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/${webhookToken}`;

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-dark">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Webhook Mantiks, LGM et Intelligence Artificielle</p>
      </div>

      {/* User selector */}
      <section className="bg-brand-pink/10 border border-brand-pink/30 rounded-xl p-4">
        <label className="block text-sm font-medium text-brand-dark mb-2">
          Gérer les paramètres de
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        {selectedUser && (
          <p className="text-xs text-gray-500 mt-1.5">
            Vous éditez les paramètres de <strong>{selectedUser.name}</strong>
          </p>
        )}
      </section>

      {loading ? (
        <div className="text-gray-500 text-sm">Chargement...</div>
      ) : (
        <>
          {/* Webhook */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-brand-dark">Webhook Mantiks</h2>
            <p className="text-sm text-gray-600">
              Configurez cette URL dans le compte Mantiks de cet utilisateur pour recevoir les offres et leads.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-brand-dark overflow-x-auto">
                {webhookUrl}
              </code>
              <button
                type="button"
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
              Quand l&apos;utilisateur coche <strong>CONTACTER</strong>, le lead est automatiquement ajouté à sa campagne LGM.
            </p>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Clé API LGM</label>
              <input
                type="password"
                value={lgmApiKey}
                onChange={(e) => setLgmApiKey(e.target.value)}
                placeholder="Clé API La Growth Machine"
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
          </section>

          {/* Intelligence Artificielle */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-brand-dark">Intelligence Artificielle</h2>
              <p className="text-sm text-gray-600 mt-1">
                Utilisée pour les champs personnalisés de type IA (bouton ⚡ dans le tableau).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Fournisseur actif
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AI_PROVIDERS.map((p) => {
                  const isActive = aiProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAiProvider(p.id)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? "border-brand-dark bg-brand-dark text-white"
                          : "border-gray-200 hover:border-gray-300 text-brand-dark"
                      }`}
                    >
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className={`text-xs mt-0.5 ${isActive ? "text-white/70" : "text-gray-400"}`}>
                        {p.model}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-brand-dark">Clés API</label>
              {AI_PROVIDERS.map((p) => {
                const isActive = aiProvider === p.id;
                return (
                  <div key={p.id} className={`rounded-lg border px-4 py-3 ${isActive ? "border-brand-dark/30 bg-brand-beige/40" : "border-gray-100"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${isActive ? "text-brand-dark" : "text-gray-500"}`}>
                        {p.name}
                        {isActive && (
                          <span className="ml-2 text-xs bg-brand-pink text-brand-dark px-1.5 py-0.5 rounded-full font-medium">
                            actif
                          </span>
                        )}
                      </span>
                      <a
                        href={p.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-brand-dark underline"
                      >
                        Obtenir une clé
                      </a>
                    </div>
                    <input
                      type="password"
                      value={aiKeys[p.id]}
                      onChange={(e) => setAiKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder={p.placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="bg-brand-pink text-brand-dark rounded-lg px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Sauvegarde..." : saved ? "Sauvegardé ✓" : "Sauvegarder"}
          </button>
        </>
      )}
    </form>
  );
}
