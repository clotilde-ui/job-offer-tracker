import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OffersTable } from "@/components/table/offers-table";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session!.user as { id: string }).id;

  const customFields = await prisma.customFieldDef.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Offres & Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toutes les offres reçues via Mantiks
          </p>
        </div>
      </div>

      <OffersTable customFields={customFields} />
    </div>
  );
}
