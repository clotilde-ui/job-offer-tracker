import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OffersTable } from "@/components/table/offers-table";
import { UserSwitcher } from "@/components/admin/user-switcher";

interface Props {
  searchParams: Promise<{ userId?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const selfId = (session!.user as { id: string }).id;
  const role = (session!.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN";

  const { userId: targetParam } = await searchParams;
  const targetUserId = isAdmin && targetParam ? targetParam : selfId;

  const [customFields, allUsers, targetUserData] = await Promise.all([
    prisma.customFieldDef.findMany({
      where: { userId: targetUserId },
      orderBy: { order: "asc" },
    }),
    isAdmin
      ? prisma.user.findMany({
          select: { id: true, name: true, email: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve(null),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true, lgmAudiences: true },
    }),
  ]);

  const targetUser = allUsers?.find((u) => u.id === targetUserId);

  let lgmAudiences: string[] = [];
  try {
    lgmAudiences = JSON.parse(targetUserData?.lgmAudiences ?? "[]");
  } catch { /* empty */ }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Offres & Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin && targetUser
              ? `Données de ${targetUser.name}`
              : "Toutes les offres reçues via Mantiks"}
          </p>
        </div>

        {isAdmin && allUsers && (
          <UserSwitcher users={allUsers} currentUserId={targetUserId} />
        )}
      </div>

      <OffersTable
        customFields={customFields}
        targetUserId={isAdmin ? targetUserId : undefined}
        lgmAudiences={lgmAudiences}
      />
    </div>
  );
}
