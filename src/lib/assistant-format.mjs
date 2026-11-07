function tokenizeBold(text) {
  const segments = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ text: text.slice(cursor, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length || segments.length === 0) {
    segments.push({ text: text.slice(cursor), bold: false });
  }
  return segments;
}

/** Parse only paragraphs, simple bullet lists, and **bold**; never parse HTML. */
export function formatAssistantMessage(content) {
  return content
    .split(/\n\s*\n/)
    .filter((block) => block.length > 0)
    .map((block) => {
      const lines = block.split("\n");
      if (/^\s*[-•]\s+/.test(lines[0])) {
        return {
          kind: "list",
          items: lines.map((line) =>
            tokenizeBold(line.replace(/^\s*[-•]\s+/, "")),
          ),
        };
      }
      return { kind: "paragraph", segments: tokenizeBold(block) };
    });
}
