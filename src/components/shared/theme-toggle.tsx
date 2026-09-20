"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useUIStore } from "@/store/ui";

/** Theme switcher — persists to localStorage and applies before paint. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 rounded-[10px] border border-rule bg-transparent"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={
        compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-rule bg-panel text-ink-soft transition-colors hover:border-navy hover:text-navy"
          : "inline-flex h-9 items-center gap-2 rounded-[10px] border border-rule bg-panel px-3 text-[13px] font-medium text-ink-soft transition-colors hover:border-navy hover:text-navy"
      }
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? (
        <Sun className="h-[15px] w-[15px]" aria-hidden="true" />
      ) : (
        <Moon className="h-[15px] w-[15px]" aria-hidden="true" />
      )}
      {!compact && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
    </button>
  );
}
