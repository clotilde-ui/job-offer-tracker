"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/cn";

interface Sender {
  id: string;
  name: string;
  type?: string;
}

interface Message {
  id: string;
  body: string;
  type?: string;
  created_at?: string;
  sent_at?: string;
}

interface LastMessage {
  id: string;
  body: string;
  sent_at?: string;
  sender?: Sender;
}

interface Conversation {
  id: string;
  subject?: string;
  status?: string;
  unread_count?: number;
  last_message?: LastMessage;
  participants?: Sender[];
  messages?: Message[];
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("open");

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lgm/inbox?status=${statusFilter}&per_page=50`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Erreur ${res.status}`);
        setConversations([]);
      } else {
        setConversations(data.data ?? []);
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  async function openConversation(conv: Conversation) {
    setSelected(conv);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/lgm/inbox/${conv.id}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function updateStatus(convId: string, status: string) {
    await fetch(`/api/lgm/inbox/${convId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, status } : c)));
    if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status } : prev);
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Inbox LGM</h1>
          <p className="text-sm text-gray-500 mt-1">Conversations LinkedIn via La Growth Machine</p>
        </div>
        <div className="flex items-center gap-2">
          {(["open", "closed", "snoozed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setSelected(null); }}
              className={cn(
                "px-3 py-1.5 text-sm border transition-colors",
                statusFilter === s
                  ? "bg-brand-dark text-white border-brand-dark"
                  : "border-gray-300 text-brand-dark hover:bg-gray-50"
              )}
            >
              {s === "open" ? "Ouvertes" : s === "closed" ? "Fermées" : "En attente"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversations list */}
        <div className="w-80 flex-shrink-0 border border-gray-200 bg-white overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-400">Chargement...</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-500">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">Aucune conversation</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={cn(
                  "px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                  selected?.id === conv.id && "bg-brand-pink/10 border-l-2 border-l-brand-pink"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm text-brand-dark truncate">
                    {conv.subject ?? conv.last_message?.sender?.name ?? "Conversation"}
                  </span>
                  {conv.unread_count ? (
                    <span className="bg-brand-pink text-brand-dark text-xs font-bold px-1.5 py-0.5 min-w-[20px] text-center shrink-0">
                      {conv.unread_count}
                    </span>
                  ) : null}
                </div>
                {conv.last_message?.body && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message.body}</p>
                )}
                <div className="flex items-center justify-between mt-1">
                  {conv.last_message?.sent_at && (
                    <span className="text-xs text-gray-400">
                      {new Date(conv.last_message.sent_at).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  <span className={cn(
                    "text-xs px-1.5 py-0.5",
                    conv.status === "open" ? "bg-[#26B743]/10 text-[#26B743]" :
                    conv.status === "closed" ? "bg-gray-100 text-gray-500" :
                    "bg-yellow-50 text-yellow-600"
                  )}>
                    {conv.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Conversation detail */}
        <div className="flex-1 flex flex-col border border-gray-200 bg-white min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Sélectionnez une conversation
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-brand-dark">
                    {selected.subject ?? "Conversation"}
                  </h2>
                  {selected.participants && selected.participants.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selected.participants.map((p) => p.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selected.status === "open" && (
                    <button
                      onClick={() => updateStatus(selected.id, "closed")}
                      className="text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 text-brand-dark"
                    >
                      Fermer
                    </button>
                  )}
                  {selected.status === "closed" && (
                    <button
                      onClick={() => updateStatus(selected.id, "open")}
                      className="text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 text-brand-dark"
                    >
                      Rouvrir
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {loadingMessages ? (
                  <p className="text-sm text-gray-400">Chargement des messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun message</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[75%] px-4 py-2.5 text-sm",
                        msg.type === "outgoing"
                          ? "ml-auto bg-brand-dark text-white"
                          : "mr-auto bg-gray-100 text-brand-dark"
                      )}
                    >
                      <p>{msg.body}</p>
                      {(msg.created_at ?? msg.sent_at) && (
                        <p className={cn("text-xs mt-1", msg.type === "outgoing" ? "text-white/60" : "text-gray-400")}>
                          {new Date(msg.created_at ?? msg.sent_at!).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
