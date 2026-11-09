"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  requestData,
  requestPost,
  requestPut,
  requestPatch,
  requestDelete,
} from "@/lib/api";
import type {
  ApplicationRecord,
  DashboardPayload,
  NotificationRecord,
  ProjectRecord,
  ResumeLibraryDetail,
  ResumeLibraryRecord,
  ResumeRecord,
  ResumeVersionSummary,
  RoadmapTask,
  SessionRecord,
  SkillRecord,
  UserProfile,
  CareerProfile,
} from "@/types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => requestData<DashboardPayload>("/dashboard"),
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => requestData<SkillRecord[]>("/skills"),
  });
}

/**
 * Skills feed the dashboard's coverage metric, the skillGaps list and 25% of
 * the readiness score, so every write invalidates both queries. The server
 * owns computed fields (progress, verifiedBy) — payloads contain raw inputs
 * only and validation error copy comes back in the envelope.
 */
export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestPost<SkillRecord>("/skills", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, payload }: { skillId: string; payload: Record<string, unknown> }) =>
      requestPatch<SkillRecord>(`/skills/${skillId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) =>
      requestDelete<{ removedId: string; name: string }>(`/skills/${skillId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRoadmap() {
  return useQuery({
    queryKey: ["roadmap"],
    queryFn: () => requestData<RoadmapTask[]>("/roadmap"),
  });
}

export function useResumes() {
  return useQuery({
    queryKey: ["resumes"],
    queryFn: () => requestData<ResumeRecord[]>("/resumes"),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => requestData<ProjectRecord[]>("/projects"),
  });
}

export function useApplications(status?: string) {
  return useQuery({
    queryKey: ["applications", status ?? "all"],
    queryFn: () =>
      requestData<ApplicationRecord[]>(`/applications${status ? `?status=${status}` : ""}`),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => requestData<NotificationRecord[]>("/notifications"),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => requestData<{ user: UserProfile; profile: CareerProfile | null }>("/profile"),
  });
}

/**
 * Signed-in devices. The refresh cookie flows through /auth/*, so the server
 * can mark which row is the calling device; revocation is per-session.
 */
export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => requestData<SessionRecord[]>("/auth/sessions"),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      requestDelete<SessionRecord>(`/auth/sessions/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

/**
 * Persist profile edits with PUT /profile and fold the server-returned
 * { user, profile } straight back into the cache. Dashboard goes stale since
 * target-role/timeline changes recalculate readiness.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestPut<{ user: UserProfile; profile: CareerProfile }>("/profile", payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * RES-003A private resume library (/resumes/library). Every query and
 * mutation is authenticated; ownership is decided server-side from the
 * access token — the client never sends a user id. Saves carry the
 * `expectedRevision` the tab loaded, so a second tab saving the same resume
 * gets a 409 RESUME_EDIT_CONFLICT instead of silently overwriting.
 */
const LIBRARY_KEY = ["resume-library"] as const;
const libraryKeys = {
  all: LIBRARY_KEY,
  detail: (id: string) => [...LIBRARY_KEY, id] as const,
  versions: (id: string) => [...LIBRARY_KEY, id, "versions"] as const,
};

export function useResumeLibrary() {
  return useQuery({
    queryKey: libraryKeys.all,
    queryFn: () => requestData<ResumeLibraryRecord[]>("/resumes/library"),
  });
}

export function useResumeLibraryDetail(id: string | null) {
  return useQuery({
    queryKey: libraryKeys.detail(id ?? "none"),
    queryFn: () => requestData<ResumeLibraryDetail>(`/resumes/library/${id}`),
    enabled: Boolean(id),
  });
}

export function useResumeVersions(id: string | null) {
  return useQuery({
    queryKey: libraryKeys.versions(id ?? "none"),
    queryFn: () => requestData<ResumeVersionSummary[]>(`/resumes/library/${id}/versions`),
    enabled: Boolean(id),
  });
}

function invalidateLibrary(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: libraryKeys.all });
  if (id) {
    queryClient.invalidateQueries({ queryKey: libraryKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: libraryKeys.versions(id) });
  }
}

export function useCreateResumeLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; targetRoleLabel?: string; content: unknown }) =>
      requestPost<ResumeLibraryDetail>("/resumes/library", payload),
    onSuccess: (data) => invalidateLibrary(queryClient, data.id),
  });
}

export function useSaveResumeVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      expectedRevision: number;
      targetRoleLabel?: string;
      content: unknown;
    }) =>
      requestPost<ResumeLibraryDetail>(`/resumes/library/${input.id}/versions`, {
        expectedRevision: input.expectedRevision,
        ...(input.targetRoleLabel ? { targetRoleLabel: input.targetRoleLabel } : {}),
        content: input.content,
      }),
    onSuccess: (_data, variables) => invalidateLibrary(queryClient, variables.id),
  });
}

export function useRenameResumeLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      requestPatch<ResumeLibraryRecord>(`/resumes/library/${input.id}`, { name: input.name }),
    onSuccess: (_data, variables) => invalidateLibrary(queryClient, variables.id),
  });
}

export function useDuplicateResumeLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name?: string; targetRoleLabel?: string }) =>
      requestPost<ResumeLibraryDetail>(`/resumes/library/${input.id}/duplicate`, input),
    onSuccess: (data) => invalidateLibrary(queryClient, data.id),
  });
}

export function useDeleteResumeLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      requestDelete<{ removedId: string; name: string }>(`/resumes/library/${id}`),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}
