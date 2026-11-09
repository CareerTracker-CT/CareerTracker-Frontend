"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { layoutResume } from "@/lib/resume-pdf.mjs";
import type { ResumeDocument } from "@/lib/resume-builder.mjs";

/**
 * Live preview of the exact layout the PDF writer will emit.
 *
 * Blocks are positioned from the shared layout pass, so pagination, wrapping
 * and margins match the exported file instead of being a separate CSS guess.
 * The pages are scaled to the available width (never overflowing on mobile)
 * and re-scale with a ResizeObserver.
 */
export function ResumePreview({
  document,
  showPageNumbers = true,
}: {
  document: ResumeDocument;
  showPageNumbers?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.9);
  const layout = useMemo(() => layoutResume(document), [document]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      const available = node.clientWidth - 24;
      if (available <= 0) return;
      setScale(Math.min(1, Math.max(0.34, available / layout.width)));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [layout.width]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 py-4">
      {layout.pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="resume-page relative shrink-0 overflow-hidden border border-rule bg-white shadow-[0_1px_2px_rgba(16,24,40,0.08),0_12px_28px_-18px_rgba(16,24,40,0.35)]"
          style={{ width: page.width * scale, height: page.height * scale }}
          aria-label={`Resume page ${pageIndex + 1} of ${layout.pages.length}`}
        >
          {page.blocks.map((block, blockIndex) =>
            block.kind === "rule" ? (
              <span
                key={blockIndex}
                aria-hidden="true"
                className="absolute block bg-[#9aa3ad]"
                style={{
                  left: block.x1 * scale,
                  top: block.y * scale,
                  width: Math.max(1, (block.x2 - block.x1) * scale),
                  height: 0.6,
                }}
              />
            ) : (
              <span
                key={blockIndex}
                className="absolute whitespace-pre text-[#14181d]"
                style={{
                  left: block.x * scale,
                  top: block.y * scale,
                  fontFamily: "Helvetica, Arial, Sans-serif",
                  fontSize: block.size * scale,
                  fontWeight: block.bold ? 700 : 400,
                  lineHeight: 1.2,
                  letterSpacing: 0,
                }}
              >
                {block.text}
              </span>
            ),
          )}
          {showPageNumbers && layout.pages.length > 1 && (
            <span
              className="tnum absolute right-3 bottom-2 text-[9px] text-[#6b7280]"
              aria-hidden="true"
            >
              {pageIndex + 1} / {layout.pages.length}
            </span>
          )}
        </div>
      ))}
      <p className="text-[10px] text-warm" role="note">
        {layout.pages.length} {layout.pages.length === 1 ? "page" : "pages"} ·{" "}
        {layout.pageSize === "A4" ? "A4" : "US Letter"} · Helvetica
      </p>
    </div>
  );
}
