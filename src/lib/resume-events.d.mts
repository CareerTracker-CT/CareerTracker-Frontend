export declare const RESUME_OPEN_EVENT: string;
export function requestResumeOpen(id: string): void;
export function subscribeResumeOpen(handler: (id: string) => void): () => void;
