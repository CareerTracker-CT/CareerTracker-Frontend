import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page header used across the application — tracked label, display title,
 * supporting copy and an action slot. Keeps every screen visually consistent.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn("mb-9", className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[680px]">
          <div className="flex items-center gap-2.5">
            <span className="h-[6px] w-[6px] rounded-full bg-navy" aria-hidden="true" />
            <p className="label-caps">{eyebrow}</p>
          </div>
          <h1 className="mt-4 text-[clamp(1.95rem,3.4vw,2.65rem)] font-semibold leading-[1.1] tracking-[-0.032em] text-ink">
            {title}
          </h1>
          {description && (
            <p className="mt-3.5 max-w-[58ch] text-[14.5px] leading-[1.72] text-warm">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Ruled metric cell — label above, figure large, rule beneath. */
export function MetricCell({
  label,
  value,
  suffix,
  delta,
  deltaTone = "good",
  note,
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  deltaTone?: "good" | "warn" | "bad" | "neutral";
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-6", className)}>
      <p className="label-caps">{label}</p>
      <div className="mt-3.5 flex items-baseline gap-2">
        <p className="tnum font-display text-[31px] font-semibold leading-none tracking-[-0.032em] text-ink">
          {value}
          {suffix && <span className="text-[15px] font-normal text-warm">{suffix}</span>}
        </p>
        {delta && (
          <span
            className={cn(
              "tnum text-[11px] font-semibold",
              deltaTone === "good" && "text-good",
              deltaTone === "warn" && "text-warn",
              deltaTone === "bad" && "text-bad",
              deltaTone === "neutral" && "text-warm",
            )}
          >
            {delta}
          </span>
        )}
      </div>
      {note && <p className="mt-2.5 text-[11px] leading-[1.55] text-warm">{note}</p>}
    </div>
  );
}
