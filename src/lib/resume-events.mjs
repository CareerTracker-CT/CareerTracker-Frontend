/**
 * Cross-section navigation for the resume page.
 *
 * The analyzer and the library are sibling client sections on one page. When
 * the analyzer offers to open a role copy in the builder, it dispatches this
 * event instead of reaching into the library's React state.
 */

export const RESUME_OPEN_EVENT = "careertracker:resume-open";

export function requestResumeOpen(id) {
  if (typeof window === "undefined" || typeof id !== "string" || !id) return;
  window.dispatchEvent(new CustomEvent(RESUME_OPEN_EVENT, { detail: { id } }));
}

export function subscribeResumeOpen(handler) {
  if (typeof window === "undefined" || typeof handler !== "function") return () => {};
  const listener = (event) => {
    const id = event?.detail?.id;
    if (typeof id === "string" && id) handler(id);
  };
  window.addEventListener(RESUME_OPEN_EVENT, listener);
  return () => window.removeEventListener(RESUME_OPEN_EVENT, listener);
}
