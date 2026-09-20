"use client";

import { useQuery } from "@tanstack/react-query";
import { requestData } from "@/lib/api";
import type {
  ApplicationRecord,
  DashboardPayload,
  NotificationRecord,
  ProjectRecord,
  ResumeRecord,
  RoadmapTask,
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
