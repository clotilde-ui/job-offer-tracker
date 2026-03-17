"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return <SettingsForm workspaces={workspaces} />;
}
