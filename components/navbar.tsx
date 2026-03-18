"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";

interface NavbarProps {
  user: { name?: string | null; email?: string | null; role: string; workspaceName?: string | null };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Offres & Leads" },
    { href: "/guide", label: "Guide" },
    ...(user.role === "ADMIN"
      ? [
          { href: "/settings", label: "Paramètres" },
          { href: "/admin/workspaces", label: "Workspaces" },
          { href: "/admin/users", label: "Utilisateurs" },
        ]
      : []),
  ];

  return (
    <header className="bg-brand-dark px-6 py-3 flex items-center justify-between">
      <nav className="flex items-center gap-6">
        <span className="font-semibold text-brand-pink mr-4">Job Offer Tracker</span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium transition-colors",
              pathname === link.href
                ? "text-brand-pink"
                : "text-white/70 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {user.workspaceName && <span className="text-sm text-white/50">{user.workspaceName}</span>}
        <span className="text-sm text-white/50">{user.name ?? user.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
