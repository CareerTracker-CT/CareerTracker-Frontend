"use client";

import { motion, useReducedMotion } from "framer-motion";
import { clamp } from "@/lib/utils";

/**
 * Hand-built SVG readiness ring.
 * Outer ring = overall readiness. Inner tick band = the six dimensions,
 * each drawn as its own arc segment so the composite is legible without colour.
 */
export function ReadinessRing({
  value,
  size = 208,
  segments,
  label = "Career readiness",
}: {
  value: number;
  size?: number;
  segments: { key: string; label: string; value: number }[];
  label?: string;
}) {
  const reduce = useReducedMotion();
  const v = clamp(value);
  const stroke = 13;
  const r = (size - stroke) / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Inner dimension band
  const innerR = r - 19;
  const innerCircumference = 2 * Math.PI * innerR;
  const gap = 4;
  const segmentLength = innerCircumference / segments.length;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`${label}: ${Math.round(v)} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        {/* Ticks around the outer edge — printed-instrument detail */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const outer = r + stroke / 2 + 7;
          const inner = outer - (i % 5 === 0 ? 7 : 3.5);
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * inner}
              y1={cy + Math.sin(angle) * inner}
              x2={cx + Math.cos(angle) * outer}
              y2={cy + Math.sin(angle) * outer}
              stroke="var(--rule)"
              strokeWidth={i % 5 === 0 ? 1.3 : 0.8}
            />
          );
        })}

        {/* Track */}
        <circle cx={cx} cy={cy} r={r} stroke="var(--rule)" strokeWidth={stroke} />

        {/* Value arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="var(--navy)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? circumference * (1 - v / 100) : circumference }}
          animate={{ strokeDashoffset: circumference * (1 - v / 100) }}
          transition={{ duration: reduce ? 0 : 1.15, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Dimension band */}
        {segments.map((seg, i) => {
          const length = Math.max(segmentLength - gap, 2);
          return (
            <motion.circle
              key={seg.key}
              cx={cx}
              cy={cy}
              r={innerR}
              stroke={
                seg.value >= 75 ? "var(--good)" : seg.value >= 50 ? "var(--navy-mid)" : "var(--warn)"
              }
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${length} ${innerCircumference - length}`}
              initial={{ strokeDashoffset: reduce ? 0 : innerCircumference }}
              animate={{ strokeDashoffset: -i * segmentLength }}
              transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.25 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              opacity={0.9}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="tnum font-display text-[52px] font-semibold leading-none tracking-[-0.035em] text-ink"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: 0.15 }}
        >
          {Math.round(v)}
        </motion.span>
        <span className="label-caps mt-2">of 100</span>
      </div>
    </div>
  );
}

/** Compact progress ring used in tiles and tables. */
export function MiniRing({ value, size = 34 }: { value: number; size?: number }) {
  const v = clamp(value);
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--rule)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--navy)"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - v / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
