import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminWorkspacesClient } from "./workspaces-client";

export default async function AdminWorkspacesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  return <AdminWorkspacesClient />;
}
