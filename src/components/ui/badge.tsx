import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "warn" | "bad" | "navy";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-2 text-warm border-rule",
  good: "bg-good-wash text-good border-transparent",
  warn: "bg-warn-wash text-warn border-transparent",
  bad: "bg-bad-wash text-bad border-transparent",
  navy: "bg-navy-wash text-navy border-transparent",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.02em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The tracked small-caps section title with its hairline rule. */
export function SectionLabel({
  index,
  children,
  className,
  rule = true,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
  rule?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", rule && "mb-6", className)}>
      {index && (
        <span className="tnum font-mono text-[10.5px] font-medium tracking-[0.14em] text-navy">
          {index}
        </span>
      )}
      <span className="label-caps whitespace-nowrap">{children}</span>
      {rule && <span className="h-px flex-1 bg-rule" aria-hidden="true" />}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-rule", className)} />;
}

/** Small dot used for status — always paired with text, never colour alone. */
export function StatusDot({ tone }: { tone: "good" | "warn" | "bad" | "neutral" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-[7px] w-[7px] shrink-0 rounded-full",
        tone === "good" && "bg-good",
        tone === "warn" && "bg-warn",
        tone === "bad" && "bg-bad",
        tone === "neutral" && "bg-warm-2",
      )}
    />
  );
}
