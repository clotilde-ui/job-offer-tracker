import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);

  const rawPage = parseInt(searchParams.get("page") ?? "1");
  const rawLimit = parseInt(searchParams.get("limit") ?? "50");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
  const search = searchParams.get("search") ?? "";

  // SQLite ne supporte pas mode: "insensitive" — on filtre en JS si besoin
  const where = {
    userId,
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { company: { contains: search } },
            { leadFirstName: { contains: search } },
            { leadLastName: { contains: search } },
            { leadEmail: { contains: search } },
          ],
        }
      : {}),
  };

  const [rawData, total] = await Promise.all([
    prisma.jobOffer.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.jobOffer.count({ where }),
  ]);

  // Parse customValues JSON string → object pour le client
  const data = rawData.map((offer) => {
    let customValues: Record<string, unknown> = {};
    try {
      customValues = JSON.parse(offer.customValues ?? "{}");
    } catch {
      customValues = {};
    }
    return { ...offer, customValues };
  });

  return NextResponse.json({ data, total, page, limit });
}
