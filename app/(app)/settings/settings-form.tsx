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

  // Prospection
  const [prospectingProvider, setProspectingProvider] = useState<"lgm" | "emelia">("lgm");
  const [lgmApiKey, setLgmApiKey] = useState("");
  const [lgmAudiences, setLgmAudiences] = useState<string[]>([]);
  const [newAudience, setNewAudience] = useState("");
  const [emeliApiKey, setEmeliApiKey] = useState("");
  const [emeliaCampaigns, setEmeliaCampaigns] = useState<string[]>([]);
  const [newEmeliaCampaign, setNewEmeliaCampaign] = useState("");

  // AI
  const [aiProvider, setAiProvider] = useState<ProviderId>("claude");
  const [aiKeys, setAiKeys] = useState<Record<ProviderId, string>>({
    claude: "",
    gemini: "",
    groq: "",
    openai: "",
  });

  // Other
  const [mantiksApiKey, setMantiksApiKey] = useState("");
  const [apolloApiKey, setApolloApiKey] = useState("");
  const [phoneEnrichmentProvider, setPhoneEnrichmentProvider] = useState<"apollo" | "derrick">("apollo");
  const [derrickApiKey, setDerrickApiKey] = useState("");

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

        // Prospection
        setProspectingProvider(data.prospectingProvider === "emelia" ? "emelia" : "lgm");
        setLgmApiKey(data.lgmApiKey ?? "");
        setEmeliApiKey(data.emeliApiKey ?? "");

        let audiences: string[] = [];
        try { audiences = JSON.parse(data.lgmAudiences ?? "[]"); } catch { /* empty */ }
        if (audiences.length === 0 && data.lgmCampaignId) audiences = [data.lgmCampaignId];
        setLgmAudiences(audiences);

        let emeliaCamps: string[] = [];
        try { emeliaCamps = JSON.parse(data.emeliaCampaigns ?? "[]"); } catch { /* empty */ }
        setEmeliaCampaigns(emeliaCamps);

        // AI
        if (data.aiProvider) setAiProvider(data.aiProvider);
        setAiKeys({
          claude: data.claudeApiKey ?? "",
          gemini: data.geminiApiKey ?? "",
          groq: data.groqApiKey ?? "",
          openai: data.openaiApiKey ?? "",
        });

        // Other
        setMantiksApiKey(data.mantiksApiKey ?? "");
        setApolloApiKey(data.apolloApiKey ?? "");
        setPhoneEnrichmentProvider(data.phoneEnrichmentProvider === "derrick" ? "derrick" : "apollo");
        setDerrickApiKey(data.derrickApiKey ?? "");
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
        prospectingProvider,
        lgmApiKey,
        lgmAudiences,
        emeliApiKey,
        emeliaCampaigns,
        aiProvider,
        claudeApiKey: aiKeys.claude,
        geminiApiKey: aiKeys.gemini,
        groqApiKey: aiKeys.groq,
        openaiApiKey: aiKeys.openai,
        mantiksApiKey,
        apolloApiKey,
        phoneEnrichmentProvider,
        derrickApiKey,
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

  function addEmeliaCampaign() {
    const trimmed = newEmeliaCampaign.trim();
    if (!trimmed || emeliaCampaigns.includes(trimmed)) return;
    setEmeliaCampaigns((prev) => [...prev, trimmed]);
    setNewEmeliaCampaign("");
  }

  function removeEmeliaCampaign(name: string) {
    setEmeliaCampaigns((prev) => prev.filter((c) => c !== name));
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
        <p className="text-sm text-gray-500 mt-1">Webhook, Prospection et Intelligence Artificielle</p>
      </div>

      {/* Workspace selector */}
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

          {/* Prospection */}
          <section className="bg-white border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-brand-dark">Outil de prospection</h2>
              <p className="text-sm text-gray-600 mt-1">
                Quand un utilisateur choisit une campagne dans la colonne <strong>CONTACTER</strong>,
                le lead est automatiquement envoyé vers l&apos;outil sélectionné.
              </p>
            </div>

            {/* Provider toggle */}
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">Outil actif</label>
              <div className="grid grid-cols-2 gap-2">
                {(["lgm", "emelia"] as const).map((p) => {
                  const isActive = prospectingProvider === p;
                  const label = p === "lgm" ? "La Growth Machine" : "Emelia";
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProspectingProvider(p)}
                      className={`border-2 px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? "border-brand-dark bg-brand-dark text-white"
                          : "border-gray-200 hover:border-gray-300 text-brand-dark"
                      }`}
                    >
                      <div className="font-medium text-sm">{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LGM sub-section */}
            <div className={`space-y-4 ${prospectingProvider !== "lgm" ? "opacity-50" : ""}`}>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-brand-dark mb-3">La Growth Machine</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-1">
                      Webhook LGM <span className="text-gray-400 font-normal">(événements de campagne)</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Ajoutez cette URL dans les paramètres webhook de LGM pour recevoir les événements
                      (connexion, messages, réponses).
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

                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">Audiences LGM</label>
                    <p className="text-xs text-gray-500 mb-3">
                      Ces audiences apparaîtront dans le dropdown de la colonne CONTACTER.
                    </p>
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
                </div>
              </div>
            </div>

            {/* Emelia sub-section */}
            <div className={`space-y-4 ${prospectingProvider !== "emelia" ? "opacity-50" : ""}`}>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-brand-dark mb-3">Emelia</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-1">Clé API Emelia</label>
                    <input
                      type="password"
                      value={emeliApiKey}
                      onChange={(e) => setEmeliApiKey(e.target.value)}
                      placeholder="Votre clé API Emelia"
                      className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">Campagnes Emelia</label>
                    <p className="text-xs text-gray-500 mb-3">
                      Ces campagnes apparaîtront dans le dropdown de la colonne CONTACTER.
                    </p>
                    {emeliaCampaigns.length > 0 && (
                      <ul className="space-y-1.5 mb-3">
                        {emeliaCampaigns.map((name) => (
                          <li key={name} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 text-sm">
                            <span className="text-brand-dark">{name}</span>
                            <button
                              type="button"
                              onClick={() => removeEmeliaCampaign(name)}
                              className="text-gray-400 hover:text-red-400 transition-colors text-xs ml-4"
                            >
                              Supprimer
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newEmeliaCampaign}
                        onChange={(e) => setNewEmeliaCampaign(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmeliaCampaign(); } }}
                        placeholder="Nom de la campagne Emelia"
                        className="flex-1 border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
                      />
                      <button
                        type="button"
                        onClick={addEmeliaCampaign}
                        className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 text-brand-dark whitespace-nowrap"
                      >
                        + Ajouter
                      </button>
                    </div>
                  </div>
                </div>
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

          {/* Mantiks */}
          <section className="bg-white border border-gray-200 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-brand-dark">Mantiks</h2>
              <p className="text-sm text-gray-600 mt-1">
                Clé API pour la recherche d&apos;offres d&apos;emploi via l&apos;API Mantiks (accessible dans le dashboard admin).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Clé API Mantiks</label>
              <input
                type="password"
                value={mantiksApiKey}
                onChange={(e) => setMantiksApiKey(e.target.value)}
                placeholder="Votre clé API Mantiks"
                className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
              />
            </div>
          </section>

          {/* Enrichissement téléphonique */}
          <section className="bg-white border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-brand-dark">Enrichissement téléphonique</h2>
              <p className="text-sm text-gray-600 mt-1">
                Lorsque vous cochez &quot;Chercher tél.&quot;, le fournisseur sélectionné recherche
                automatiquement le numéro mobile du contact via son profil LinkedIn.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">Fournisseur</label>
              <div className="grid grid-cols-2 gap-2">
                {(["apollo", "derrick"] as const).map((p) => {
                  const isActive = phoneEnrichmentProvider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPhoneEnrichmentProvider(p)}
                      className={`border-2 px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? "border-brand-dark bg-brand-dark text-white"
                          : "border-gray-200 hover:border-gray-300 text-brand-dark"
                      }`}
                    >
                      <div className="font-medium text-sm">{p.charAt(0).toUpperCase() + p.slice(1)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={phoneEnrichmentProvider !== "apollo" ? "opacity-50" : ""}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-brand-dark">Clé API Apollo</label>
                <a
                  href="https://app.apollo.io/#/settings/integrations/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-brand-dark underline"
                >
                  Obtenir une clé
                </a>
              </div>
              <input
                type="password"
                value={apolloApiKey}
                onChange={(e) => setApolloApiKey(e.target.value)}
                placeholder="Votre clé API Apollo"
                className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
              />
            </div>

            <div className={phoneEnrichmentProvider !== "derrick" ? "opacity-50" : ""}>
              <label className="block text-sm font-medium text-brand-dark mb-1">Clé API Derrick</label>
              <input
                type="password"
                value={derrickApiKey}
                onChange={(e) => setDerrickApiKey(e.target.value)}
                placeholder="Votre clé API Derrick"
                className="w-full border border-gray-300 px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink"
              />
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
