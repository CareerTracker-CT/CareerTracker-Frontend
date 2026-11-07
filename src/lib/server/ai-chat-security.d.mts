export class BackendUnauthorizedError extends Error {}

export interface AiPrincipal {
  id: string;
  token: string;
}

export interface CareerContext {
  dashboard: import("@/types").DashboardPayload;
  skills: import("@/types").SkillRecord[];
  tasks: import("@/types").RoadmapTask[];
  resumeSummary: string;
}

export function verifyBackendSession(
  request: Request,
  options: { baseUrl: string; fetchImpl?: typeof fetch },
): Promise<AiPrincipal | null>;

export function loadBackendCareerContext(
  request: Request,
  principal: AiPrincipal,
  options: { baseUrl: string; fetchImpl?: typeof fetch },
): Promise<CareerContext>;

export function createAiChatPost(options: {
  verifySession: (request: Request) => Promise<AiPrincipal | null>;
  loadContext: (request: Request, principal: AiPrincipal) => Promise<CareerContext>;
  rateLimit: (key: string, limit: number) => boolean;
  generateAnswer: (message: string, context: CareerContext) => Promise<{
    answer: string;
    provider: string;
    model: string;
    groundedIn: string[];
    followUps: string[];
    degraded: boolean;
  }>;
}): (request: Request) => Promise<Response>;
