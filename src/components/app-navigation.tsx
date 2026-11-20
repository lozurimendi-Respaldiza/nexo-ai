"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WorkspaceRole } from "@/lib/workspace-context";

type AppNavigationProps = {
  role: WorkspaceRole;
};

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contactos" },
  { href: "/opportunities", label: "Oportunidades" },
  { href: "/next-best-action", label: "Next Best Action" },
  { href: "/nba-analytics", label: "Analítica" },
  { href: "/activity", label: "Historial" },
  { href: "/calendar", label: "Calendario" },
];

export function AppNavigation({ role }: AppNavigationProps) {
  const pathname = usePathname();

  const visibleLinks = [
    ...links,
    ...(role === "owner" || role === "admin"
      ? [{ href: "/settings/members", label: "Miembros" }]
      : []),
    ...(role === "owner"
      ? [{ href: "/settings/reset", label: "Administración" }]
      : []),
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
    >
      <div className="flex gap-2 overflow-x-auto">
        {visibleLinks.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
