
"use client";

import { useState } from "react";

export function CopyMessageButton({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyMessage}
      className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
      style={{
        borderColor: copied ? "var(--success)" : "var(--accent)",
        backgroundColor: copied ? "var(--success-soft)" : "var(--accent-soft)",
        color: copied ? "var(--success)" : "var(--accent)",
      }}
      aria-live="polite"
    >
      {copied ? "Copiado" : "Copiar mensaje"}
    </button>
  );
}
