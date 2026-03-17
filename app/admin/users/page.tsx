import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminUsersClient } from "@/components/admin/users-client";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-dark px-6 py-3 flex items-center gap-4">
        <span className="font-semibold text-brand-pink">Offres Emploi</span>
        <a href="/dashboard" className="text-sm text-white/70 hover:text-white transition-colors">
          Offres & Leads
        </a>
        <span className="text-sm font-medium text-brand-pink">Utilisateurs</span>
      </header>
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-brand-dark">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">Créez et gérez les comptes utilisateurs</p>
        </div>
        <AdminUsersClient />
      </main>
    </div>
  );
}
