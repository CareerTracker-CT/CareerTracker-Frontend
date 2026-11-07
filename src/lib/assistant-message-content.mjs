import { createElement as h } from "react";
import { formatAssistantMessage } from "./assistant-format.mjs";

function renderSegments(segments, keyPrefix) {
  return segments.map((segment, index) =>
    segment.bold
      ? h("strong", { key: `${keyPrefix}-${index}`, className: "font-semibold text-ink" }, segment.text)
      : h("span", { key: `${keyPrefix}-${index}` }, segment.text),
  );
}

/** React text rendering only; markup and URLs in the model answer stay inert. */
export function AssistantMessageContent({ content }) {
  return h(
    "div",
    { className: "mt-3 text-[12.5px] leading-[1.86] text-ink-soft" },
    ...formatAssistantMessage(content).map((block, index) =>
      block.kind === "list"
        ? h(
            "ul",
            { key: index, className: "my-2.5 space-y-2" },
            ...block.items.map((segments, itemIndex) =>
              h(
                "li",
                { key: itemIndex, className: "flex items-start gap-2.5" },
                h("span", {
                  className: "mt-[9px] h-[3.5px] w-[3.5px] shrink-0 rounded-full bg-navy",
                  "aria-hidden": "true",
                }),
                h("span", null, ...renderSegments(segments, `${index}-${itemIndex}`)),
              ),
            ),
          )
        : h(
            "p",
            { key: index, className: "my-2.5" },
            ...renderSegments(block.segments, `${index}`),
          ),
    ),
  );
}
