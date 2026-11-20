
"use client";

import { useTheme, type ThemePreference } from "@/components/theme-provider";

type ThemeSelectorProps = {
  compact?: boolean;
};

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      {!compact && <span style={{ color: "var(--ink)" }}>Apariencia</span>}
      <select
        aria-label="Seleccionar apariencia"
        value={theme}
        onChange={(event) =>
          setTheme(event.target.value as ThemePreference)
        }
        className="rounded-lg border px-3 py-2"
        style={{
          backgroundColor: "var(--field)",
          color: "var(--ink)",
          borderColor: "var(--line)",
        }}
      >
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
        <option value="system">Sistema</option>
      </select>
    </label>
  );
}
