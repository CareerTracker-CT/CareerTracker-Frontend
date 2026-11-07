export interface TextSegment {
  text: string;
  bold: boolean;
}

export type AssistantBlock =
  | { kind: "paragraph"; segments: TextSegment[] }
  | { kind: "list"; items: TextSegment[][] };

export function formatAssistantMessage(content: string): AssistantBlock[];
