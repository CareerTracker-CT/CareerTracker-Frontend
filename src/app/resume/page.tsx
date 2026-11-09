"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentIntake } from "@/components/resume/document-intake";
import { ResumeLibrary } from "@/components/resume/resume-library";

export default function ResumePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Resume analysis"
        title="Professional resume and job workspace"
        description="Compare resume evidence against a job description, inspect every requirement's exact sources, and review document extraction limits without leaving the page."
      />

      <DocumentIntake />

      <ResumeLibrary />
    </AppShell>
  );
}
