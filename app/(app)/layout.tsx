import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const workspace = session.user.workspaceId
    ? await prisma.workspace.findUnique({ where: { id: session.user.workspaceId }, select: { name: true } })
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          workspaceName: workspace?.name,
        }}
      />
      <main className="flex-1 p-6 max-w-full overflow-x-auto">{children}</main>
    </div>
  );
}
