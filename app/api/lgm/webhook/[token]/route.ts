import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// LGM sends webhook events for lead activity.
// We match leads by email or LinkedIn URL and update the relevant event timestamp.

// Known LGM event type strings (various formats observed in the wild)
const EVENT_MAP: Record<string, keyof typeof EVENT_FIELDS> = {
  // Connection sent
  linkedin_connection_request_sent: "lgmConnectionSentAt",
  linkedin_connection_sent: "lgmConnectionSentAt",
  LINKEDIN_CONNECTION_REQUEST_SENT: "lgmConnectionSentAt",
  LINKEDIN_CONNECTION_SENT: "lgmConnectionSentAt",
  connection_request_sent: "lgmConnectionSentAt",
  // Connection accepted
  linkedin_connection_accepted: "lgmConnectionAcceptedAt",
  LINKEDIN_CONNECTION_ACCEPTED: "lgmConnectionAcceptedAt",
  connection_accepted: "lgmConnectionAcceptedAt",
  // Message sent (we track the first message)
  linkedin_message_sent: "lgmMessage1SentAt",
  LINKEDIN_MESSAGE_SENT: "lgmMessage1SentAt",
  message_sent: "lgmMessage1SentAt",
  // Reply received
  reply_received: "lgmRepliedAt",
  lead_replied: "lgmRepliedAt",
  REPLY_RECEIVED: "lgmRepliedAt",
  LEAD_REPLIED: "lgmRepliedAt",
  linkedin_reply_received: "lgmRepliedAt",
  LINKEDIN_REPLY_RECEIVED: "lgmRepliedAt",
};

// These are datetime fields on JobOffer
const EVENT_FIELDS = {
  lgmConnectionSentAt: true,
  lgmConnectionAcceptedAt: true,
  lgmMessage1SentAt: true,
  lgmRepliedAt: true,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Authenticate by workspace webhookToken
  const workspace = await prisma.workspace.findUnique({
    where: { webhookToken: token },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // LGM may send a single event or an array of events
  const events: unknown[] = Array.isArray(body) ? body : [body];

  let processed = 0;

  for (const event of events) {
    if (typeof event !== "object" || event === null) continue;

    const ev = event as Record<string, unknown>;

    // Extract event type — LGM uses various field names
    const eventType = String(
      ev.event_type ?? ev.event ?? ev.type ?? ev.eventType ?? ""
    );

    // Extract occurred_at — fall back to now
    const occurredAt = ev.occurred_at ?? ev.occurredAt ?? ev.created_at ?? ev.timestamp;
    const eventDate = occurredAt ? new Date(String(occurredAt)) : new Date();

    // Extract lead identifiers from various payload shapes
    const lead = (ev.lead ?? ev.data ?? {}) as Record<string, unknown>;
    const email = String(
      ev.lead_email ?? lead.email ?? lead.lead_email ?? lead.proEmail ?? ""
    ).toLowerCase().trim();
    const linkedinUrl = String(
      ev.linkedin_url ?? lead.linkedin_url ?? lead.linkedinUrl ?? lead.linkedin ?? ""
    ).trim();

    // Extract reply content if present
    const replyContent = String(
      ev.content ?? ev.message ?? lead.content ?? lead.message ?? ev.reply ?? ""
    ) || null;

    if (!email && !linkedinUrl) continue;

    // Find matching JobOffer in this workspace
    const where: { workspaceId: string; OR: object[] } = {
      workspaceId: workspace.id,
      OR: [],
    };
    if (email) {
      where.OR.push({ leadEmail: { equals: email } });
    }
    if (linkedinUrl) {
      // Normalize trailing slash
      const normalized = linkedinUrl.replace(/\/$/, "");
      where.OR.push({ leadLinkedin: { contains: normalized } });
    }
    if (where.OR.length === 0) continue;

    const offers = await prisma.jobOffer.findMany({
      where,
      select: { id: true, lgmEvents: true, lgmMessage1SentAt: true },
    });

    if (offers.length === 0) continue;

    for (const offer of offers) {
      // Build update data
      const updateData: Record<string, unknown> = {};

      // Map event type to a field
      const field = EVENT_MAP[eventType];
      if (field) {
        // For lgmMessage1SentAt, only set if not already set
        if (field !== "lgmMessage1SentAt" || !offer.lgmMessage1SentAt) {
          updateData[field] = eventDate;
        }
        // For replies, also store the content
        if (field === "lgmRepliedAt" && replyContent) {
          updateData.lgmReplyContent = replyContent;
        }
      }

      // Append to raw events log regardless of known type
      const rawEvents: unknown[] = (() => {
        try {
          return JSON.parse(offer.lgmEvents ?? "[]");
        } catch {
          return [];
        }
      })();
      rawEvents.push({ eventType, occurredAt: eventDate.toISOString(), raw: ev });
      updateData.lgmEvents = JSON.stringify(rawEvents);

      await prisma.jobOffer.update({
        where: { id: offer.id },
        data: updateData,
      });
      processed++;
    }
  }

  return NextResponse.json({ ok: true, processed });
}
