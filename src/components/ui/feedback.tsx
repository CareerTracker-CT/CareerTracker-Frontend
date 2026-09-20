import { AlertTriangle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-[42%]" />
            <Skeleton className="h-3 w-[24%]" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * Empty state contract: what is missing → why it matters → what to do next.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[12px] border border-dashed border-rule-strong bg-panel/60 px-8 py-12 text-center",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent 0 9px, color-mix(in srgb, var(--rule) 45%, transparent) 9px 10px)",
        }}
        aria-hidden="true"
      />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-[10px] border border-rule bg-paper">
          <Icon className="h-[19px] w-[19px] text-navy" strokeWidth={1.7} aria-hidden="true" />
        </div>
        <h3 className="text-[19px] font-semibold text-ink">{title}</h3>
        <p className="mx-auto mt-2.5 max-w-[46ch] text-[14px] leading-[1.65] text-warm">{description}</p>
        {(action || secondaryAction) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  );
}

/** Human, actionable error state — never a stack trace. */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-4 rounded-[12px] border border-bad/30 bg-bad-wash/50 p-6 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-bad-wash">
        <AlertTriangle className="h-[18px] w-[18px] text-bad" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-[14.5px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[13.5px] leading-[1.6] text-warm">{description}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-base inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-rule-strong bg-panel px-4 text-[13px] font-medium text-ink hover:border-navy hover:text-navy"
        >
          <RefreshCw className="h-[15px] w-[15px]" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/** Contextual loading message used for long-running AI operations. */
export function ProcessingNote({ message, step }: { message: string; step?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-navy/20 bg-navy-wash/50 px-4 py-3">
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-navy opacity-50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-navy" />
      </span>
      <p className="text-[13px] text-navy" aria-live="polite">
        {message}
        {step && <span className="tnum ml-2 font-mono text-[11px] opacity-70">{step}</span>}
      </p>
    </div>
  );
}
