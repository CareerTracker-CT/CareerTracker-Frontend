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
  ResumeRecord,
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
