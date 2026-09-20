import { cn } from "@/lib/utils";

/**
 * CareerTracker monogram.
 * A single-stroke open "C" (the dossier stamp) enclosing an ascending
 * three-bar trajectory. Drawn as real path data so it scales cleanly,
 * reverses to one colour, and stays legible down to 16px.
 */
export function Monogram({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="CareerTracker"
      className={cn("text-navy", className)}
    >
      {/* Open C — arc stroke */}
      <path
        d="M23.4 9.6A9.2 9.2 0 1 0 23.4 22.4"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Ascending trajectory bars */}
      <path
        d="M11.6 21.2V18.1"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M16.2 21.2V14.2"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M20.8 21.2V11.2"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  monogramSize = 26,
  inverted = false,
}: {
  className?: string;
  monogramSize?: number;
  inverted?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Monogram size={monogramSize} className={inverted ? "text-white" : "text-navy"} />
      <span
        className={cn(
          "font-display text-[19px] font-semibold leading-none tracking-[-0.028em]",
          inverted ? "text-white" : "text-ink",
        )}
      >
        Career<span className={inverted ? "text-white/70" : "text-navy"}>Tracker</span>
      </span>
    </span>
  );
}
