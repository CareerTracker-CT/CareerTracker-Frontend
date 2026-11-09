import type { PageSize, ResumeDocument } from "./resume-builder.mjs";

export interface LayoutTextBlock {
  kind: "text";
  x: number;
  y: number;
  size: number;
  bold: boolean;
  text: string;
}

export interface LayoutRuleBlock {
  kind: "rule";
  x1: number;
  x2: number;
  y: number;
}

export type LayoutBlock = LayoutTextBlock | LayoutRuleBlock;

export interface LayoutPage {
  width: number;
  height: number;
  blocks: LayoutBlock[];
}

export interface ResumeLayout {
  pageSize: PageSize;
  width: number;
  height: number;
  margin: number;
  pages: LayoutPage[];
}

export interface PdfOptions {
  pageSize?: PageSize;
  margin?: number;
}

export declare const LAYOUT: {
  margin: number;
  bodySize: number;
  bodyLeading: number;
  headingSize: number;
  nameSize: number;
  smallSize: number;
  bulletIndent: number;
  entryGap: number;
  sectionGap: number;
};

export function measureText(text: string, size: number, bold?: boolean): number;
export function layoutResume(document: ResumeDocument | unknown, options?: PdfOptions): ResumeLayout;
export function renderResumePdf(
  document: ResumeDocument | unknown,
  options?: PdfOptions,
): Uint8Array;
export function resumePdfBlob(document: ResumeDocument | unknown, options?: PdfOptions): Blob;
