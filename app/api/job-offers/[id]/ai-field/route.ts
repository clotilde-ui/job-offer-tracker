import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

type Provider = "claude" | "gemini" | "groq" | "openai";

async function callClaude(apiKey: string, prompt: string, context: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: `${prompt}\n\nDonnées de l'offre :\n${context}\n\nRéponds de manière concise.` }],
  });
  return response.content[0].type === "text" ? response.content[0].text.trim() : "";
}

async function callGemini(apiKey: string, prompt: string, context: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nDonnées de l'offre :\n${context}\n\nRéponds de manière concise.` }] }],
        generationConfig: { maxOutputTokens: 200 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function callGroq(apiKey: string, prompt: string, context: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      messages: [{ role: "user", content: `${prompt}\n\nDonnées de l'offre :\n${context}\n\nRéponds de manière concise.` }],
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callOpenAI(apiKey: string, prompt: string, context: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [{ role: "user", content: `${prompt}\n\nDonnées de l'offre :\n${context}\n\nRéponds de manière concise.` }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id: offerId } = await params;
  const { fieldId, prompt } = await req.json();

  if (!fieldId || !prompt) {
    return NextResponse.json({ error: "fieldId et prompt requis" }, { status: 400 });
  }

  const [offer, field, user] = await Promise.all([
    prisma.jobOffer.findFirst({ where: { id: offerId, userId } }),
    prisma.customFieldDef.findFirst({ where: { id: fieldId, userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { aiProvider: true, claudeApiKey: true, geminiApiKey: true, groqApiKey: true, openaiApiKey: true },
    }),
  ]);

  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (!field) return NextResponse.json({ error: "Champ introuvable" }, { status: 404 });

  const provider = (user?.aiProvider ?? "claude") as Provider;

  const keyMap: Record<Provider, string | null | undefined> = {
    claude: user?.claudeApiKey,
    gemini: user?.geminiApiKey,
    groq: user?.groqApiKey,
    openai: user?.openaiApiKey,
  };

  const apiKey = keyMap[provider] ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: `Clé API ${provider} non configurée. Rendez-vous dans Paramètres > Intelligence Artificielle.` },
      { status: 400 }
    );
  }

  const context = [
    `Titre : ${offer.title}`,
    `Entreprise : ${offer.company}`,
    offer.description ? `Description : ${offer.description}` : null,
    offer.offerLocation ? `Localisation : ${offer.offerLocation}` : null,
    offer.source ? `Source : ${offer.source}` : null,
    offer.leadFirstName || offer.leadLastName
      ? `Lead : ${[offer.leadCivility, offer.leadFirstName, offer.leadLastName].filter(Boolean).join(" ")}`
      : null,
    offer.leadJobTitle ? `Poste du lead : ${offer.leadJobTitle}` : null,
    offer.leadEmail ? `Email lead : ${offer.leadEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const callers: Record<Provider, (key: string, p: string, c: string) => Promise<string>> = {
    claude: callClaude,
    gemini: callGemini,
    groq: callGroq,
    openai: callOpenAI,
  };

  const value = await callers[provider](apiKey, prompt, context);

  const customValues = JSON.parse(offer.customValues || "{}");
  customValues[field.name] = value;
  await prisma.jobOffer.update({
    where: { id: offerId },
    data: { customValues: JSON.stringify(customValues) },
  });

  return NextResponse.json({ value });
}
