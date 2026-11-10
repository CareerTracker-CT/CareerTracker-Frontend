"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, refreshSession, setAccessToken } from "@/lib/api";
import { clearFirebaseIdentity } from "@/lib/firebase/client";
import type { UserProfile } from "@/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  /** Establish an in-memory session from a freshly minted access token. */
  signIn: (accessToken: string) => Promise<void>;
  /** Revoke the server session (if possible) and drop the local one. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Pages reachable without an authenticated session. */
const PUBLIC_PAGES = new Set(["/", "/login", "/onboarding"]);

interface ProfileEnvelope {
  success: boolean;
  data?: {
    user?: UserProfile;
    profile?: unknown;
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const loadProfile = useCallback(async (token: string) => {
    try {
      const { data } = await api.get<ProfileEnvelope>("/profile");
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        setStatus("authenticated");
        return true;
      }
    } catch {
      // A dead session edge case: the refresh call succeeded but the profile
      // request can no longer authenticate. Force the next request to rotate.
      setAccessToken(null);
    }
    return false;
  }, []);

  /* Boot: the access token is memory-held, so every page load restores the
   * session by exchanging the httpOnly refresh cookie for a new access token.
   * Strict mode may invoke this twice — refreshSession() is single-flight and
   * time-guarded, so the second call never causes a second rotation. */
  useEffect(() => {
    let disposed = false;
    (async () => {
      // One-time hygiene: older builds kept the access JWT in localStorage.
      // Nothing reads it anymore — drop the leftover so it can't be reused by
      // XSS. (Keys from other apps sharing this origin are left untouched.)
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("ct_access_token");
      }
      const token = await refreshSession();
      if (disposed) return;
      if (!token) {
        clearSession();
        return;
      }
      const ok = await loadProfile(token);
      if (!ok && !disposed) clearSession();
    })();
    return () => {
      disposed = true;
    };
  }, [clearSession, loadProfile]);

  /* Central reaction to the interceptor's 401 signal. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onExpired = () => {
      clearSession();
      queryClient.clear();
    };
    window.addEventListener("ct:session-expired", onExpired);
    return () => window.removeEventListener("ct:session-expired", onExpired);
  }, [clearSession, queryClient]);

  /* Route gate: unauthenticated visitors never see the in-app pages. */
  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (pathname && PUBLIC_PAGES.has(pathname)) return;
    router.replace("/login");
  }, [status, pathname, router]);

  const signIn = useCallback(
    async (accessToken: string) => {
      setAccessToken(accessToken);
      setUser(null);
      setStatus("authenticated");
      queryClient.clear();
      const token = accessToken;
      void loadProfile(token);
    },
    [loadProfile, queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      // The interceptor transparently refreshes an expired access token so the
      // server-side revocation still happens after an idle period.
      await api.post("/auth/logout");
    } catch {
      // Server unreachable or fully expired session — drop the local state.
    } finally {
      clearFirebaseIdentity();
      clearSession();
      queryClient.clear();
      router.replace("/login");
    }
  }, [clearSession, queryClient, router]);

  return (
    <AuthContext.Provider value={{ user, status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
