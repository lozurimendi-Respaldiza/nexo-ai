
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSelector } from "@/components/theme-selector";
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
      className="mb-6 rounded-xl border px-3 py-3"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {visibleLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--accent)"
                    : "var(--surface-secondary)",
                  color: active ? "#ffffff" : "var(--ink)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <ThemeSelector />
      </div>
    </nav>
  );
}
