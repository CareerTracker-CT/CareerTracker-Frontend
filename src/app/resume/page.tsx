"use client";

import { FileText, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentIntake } from "@/components/resume/document-intake";
import { Badge } from "@/components/ui/badge";
import { useResumes } from "@/hooks/use-api";
import { formatDate } from "@/lib/utils";

export default function ResumePage() {
  const { data, isLoading, isError, refetch } = useResumes();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Resume documents"
        title="Resume and job analysis"
        description="Preview extracted text, compare resume evidence against a job description, and inspect document readability with coverage limits shown separately."
      />

      <DocumentIntake />

      <section aria-labelledby="resume-history-title" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-navy">Resume records</p>
            <h2 id="resume-history-title" className="mt-2 text-[20px] font-semibold text-ink">Version history</h2>
            <p className="mt-1 text-[12px] text-warm">Existing backend records only. This intake preview does not create a new record.</p>
          </div>
          {isError && <button type="button" onClick={() => refetch()} className="btn-base h-9 rounded-[9px] border border-rule-strong px-3 text-[11px] text-ink"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Retry</button>}
        </div>

        {isLoading ? (
          <p className="mt-5 rounded-[12px] border border-rule bg-panel p-5 text-[12px] text-warm">Loading saved resume records…</p>
        ) : isError ? (
          <p role="status" className="mt-5 rounded-[12px] border border-rule bg-panel p-5 text-[12px] text-warm">Saved resume history is unavailable. You can still use the temporary text preview above.</p>
        ) : data?.length ? (
          <div className="mt-5 overflow-hidden rounded-[12px] border border-rule bg-panel">
            {data.map((resume, index) => (
              <article key={resume.id} className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 ${index < data.length - 1 ? "border-b border-rule" : ""}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink">{resume.fileName}</p>
                    <p className="mt-1 text-[10px] text-warm">v{resume.version} · {(resume.fileSizeBytes / 1024).toFixed(0)} KB · {formatDate(resume.createdAt)}</p>
                  </div>
                </div>
                {resume.isCurrent && <Badge tone="good">Current</Badge>}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-[12px] border border-rule bg-panel p-5 text-[12px] text-warm">No saved resume records yet.</p>
        )}
      </section>
    </AppShell>
  );
}
