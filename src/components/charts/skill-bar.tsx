"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn, clamp } from "@/lib/utils";

const LEVELS = ["None", "Beginner", "Intermediate", "Advanced", "Expert"] as const;

/**
 * Skill-gap bar: shows current level and required level on one shared axis
 * so the gap is readable without relying on colour alone (the delta is also
 * printed as text and the target is marked with a notched tick).
 */
export function SkillGapBar({
  current,
  required,
  className,
  showScale = true,
}: {
  current: number;
  required: number;
  className?: string;
  showScale?: boolean;
}) {
  const reduce = useReducedMotion();
  const c = clamp(current);
  const r = clamp(required);
  const gap = Math.max(r - c, 0);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-[7px] w-full rounded-full bg-rule">
        <motion.div
          className={cn("h-full rounded-full", gap === 0 ? "bg-good" : "bg-navy")}
          initial={{ width: reduce ? `${c}%` : 0 }}
          animate={{ width: `${c}%` }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Target notch */}
        <div
          className="absolute top-1/2 h-[15px] w-[2px] -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `calc(${r}% - 1px)` }}
          aria-hidden="true"
        />
      </div>
      {showScale && (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="tnum text-[10.5px] font-medium text-warm">{LEVELS[Math.round(c / 25)]}</span>
          <span className="tnum text-[10.5px] font-medium text-warm">
            target {LEVELS[Math.round(r / 25)]}
          </span>
        </div>
      )}
    </div>
  );
}

/** Ruled horizontal bar used in analytics blocks. */
export function LedgerBar({
  value,
  tone = "navy",
  height = 6,
}: {
  value: number;
  tone?: "navy" | "good" | "warn" | "bad";
  height?: number;
}) {
  const reduce = useReducedMotion();
  const color =
    tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : tone === "bad" ? "bg-bad" : "bg-navy";
  return (
    <div className="w-full overflow-hidden rounded-full bg-rule" style={{ height }}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: reduce ? `${clamp(value)}%` : 0 }}
        whileInView={{ width: `${clamp(value)}%` }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: reduce ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
