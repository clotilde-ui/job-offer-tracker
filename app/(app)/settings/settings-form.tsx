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

interface Workspace {
  id: string;
  name: string;
}

export function SettingsForm({ workspaces }: { workspaces: Workspace[] }) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [webhookToken, setWebhookToken] = useState("");
  const [lgmApiKey, setLgmApiKey] = useState("");
  const [lgmIdentityId, setLgmIdentityId] = useState("");
  const [lgmMemberId, setLgmMemberId] = useState("");
  const [lgmAudiences, setLgmAudiences] = useState<string[]>([]);
  const [newAudience, setNewAudience] = useState("");
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
  const [lgmWebhookCopied, setLgmWebhookCopied] = useState(false);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetch(`/api/settings?workspaceId=${selectedWorkspaceId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setWebhookToken(data.webhookToken ?? "");
        setLgmApiKey(data.lgmApiKey ?? "");
        setLgmIdentityId(data.lgmIdentityId ?? "");
        setLgmMemberId(data.lgmMemberId ?? "");

        // Parse audiences — migrate old lgmCampaignId if lgmAudiences is empty
        let audiences: string[] = [];
        try {
          audiences = JSON.parse(data.lgmAudiences ?? "[]");
        } catch { /* empty */ }
        if (audiences.length === 0 && data.lgmCampaignId) {
          audiences = [data.lgmCampaignId];
        }
        setLgmAudiences(audiences);

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
  }, [selectedWorkspaceId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/settings?workspaceId=${selectedWorkspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lgmApiKey,
        lgmIdentityId,
        lgmMemberId,
        lgmAudiences,
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

  function addAudience() {
    const trimmed = newAudience.trim();
    if (!trimmed || lgmAudiences.includes(trimmed)) return;
    setLgmAudiences((prev) => [...prev, trimmed]);
    setNewAudience("");
  }

  function removeAudience(name: string) {
    setLgmAudiences((prev) => prev.filter((a) => a !== name));
  }

  function copyWebhook() {
    const url = `${window.location.origin}/api/webhook/${webhookToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLgmWebhook() {
    const url = `${window.location.origin}/api/lgm/webhook/${webhookToken}`;
    navigator.clipboard.writeText(url);
    setLgmWebhookCopied(true);
    setTimeout(() => setLgmWebhookCopied(false), 2000);
  }

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/${webhookToken}`;
  const lgmWebhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/lgm/webhook/${webhookToken}`;

  const selectedWorkspace = workspaces.find((u) => u.id === selectedWorkspaceId);

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-dark">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Webhook, LGM et Intelligence Artificielle</p>
      </div>

      {/* User selector */}
      <section className="bg-brand-pink/10 border border-brand-pink/30 p-4">
        <label className="block text-sm font-medium text-brand-dark mb-2">
          Gérer les paramètres de
        </label>
        <select
          value={selectedWorkspaceId}
            onChange={(e) => { setLoading(true); setSelectedWorkspaceId(e.target.value); }}
          className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
        >
          {workspaces.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        {selectedWorkspace && (
          <p className="text-xs text-gray-500 mt-1.5">
            Vous éditez les paramètres de <strong>{selectedWorkspace.name}</strong>
          </p>
        )}
      </section>

      {loading ? (
        <div className="text-gray-500 text-sm">Chargement...</div>
      ) : (
        <>
          {/* Webhook */}
          <section className="bg-white border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-brand-dark">Webhook</h2>
            <p className="text-sm text-gray-600">
              Configurez cette URL dans votre outil source pour recevoir les offres et leads.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 text-xs font-mono text-brand-dark overflow-x-auto">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyWebhook}
                className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 whitespace-nowrap text-brand-dark"
              >
                {copied ? "Copié !" : "Copier"}
              </button>
            </div>
          </section>

          {/* LGM */}
          <section className="bg-white border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-brand-dark">La Growth Machine</h2>
            <p className="text-sm text-gray-600">
              Quand un utilisateur choisit une audience dans la colonne <strong>CONTACTER</strong>,
              le lead est automatiquement ajouté à cette audience LGM.
            </p>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">
                Webhook LGM <span className="text-gray-400 font-normal">(événements de campagne)</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Ajoutez cette URL dans les paramètres webhook de LGM pour recevoir les événements de campagne
                (connexion, messages, réponses) et les afficher dans le tableau.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 text-xs font-mono text-brand-dark overflow-x-auto">
                  {lgmWebhookUrl}
                </code>
                <button
                  type="button"
                  onClick={copyLgmWebhook}
                  className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 whitespace-nowrap text-brand-dark"
                >
                  {lgmWebhookCopied ? "Copié !" : "Copier"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Clé API LGM</label>
              <input
                type="password"
                value={lgmApiKey}
                onChange={(e) => setLgmApiKey(e.target.value)}
                placeholder="Clé API La Growth Machine"
                className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-dark mb-1">
                  Identity ID <span className="text-gray-400 font-normal">(envoi de messages)</span>
                </label>
                <input
                  type="text"
                  value={lgmIdentityId}
                  onChange={(e) => setLgmIdentityId(e.target.value)}
                  placeholder="5f285dd71060540008900c6b"
                  className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">ID de l&apos;identité LinkedIn connectée dans LGM</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-dark mb-1">
                  Member ID <span className="text-gray-400 font-normal">(attribution)</span>
                </label>
                <input
                  type="text"
                  value={lgmMemberId}
                  onChange={(e) => setLgmMemberId(e.target.value)}
                  placeholder="61e4bc2bfee5a67c674ca091"
                  className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">ID du membre LGM (via l&apos;API Members)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Audiences LGM
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Ces audiences apparaîtront dans le dropdown de la colonne CONTACTER.
              </p>

              {/* Audience list */}
              {lgmAudiences.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {lgmAudiences.map((name) => (
                    <li key={name} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 text-sm">
                      <span className="text-brand-dark">{name}</span>
                      <button
                        type="button"
                        onClick={() => removeAudience(name)}
                        className="text-gray-400 hover:text-red-400 transition-colors text-xs ml-4"
                      >
                        Supprimer
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add audience */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAudience(); } }}
                  placeholder="Nom exact de l'audience LGM"
                  className="flex-1 border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
                <button
                  type="button"
                  onClick={addAudience}
                  className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 text-brand-dark whitespace-nowrap"
                >
                  + Ajouter
                </button>
              </div>
            </div>
          </section>

          {/* Intelligence Artificielle */}
          <section className="bg-white border border-gray-200 p-6 space-y-5">
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
                      className={`border-2 px-3 py-2.5 text-left transition-all ${
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
                  <div key={p.id} className={`border px-4 py-3 ${isActive ? "border-brand-dark/30 bg-brand-beige/40" : "border-gray-100"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${isActive ? "text-brand-dark" : "text-gray-500"}`}>
                        {p.name}
                        {isActive && (
                          <span className="ml-2 text-xs bg-brand-pink text-brand-dark px-1.5 py-0.5 font-medium">
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
                      className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="bg-brand-pink text-brand-dark px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Sauvegarde..." : saved ? "Sauvegardé ✓" : "Sauvegarder"}
          </button>
        </>
      )}
    </form>
  );
}
