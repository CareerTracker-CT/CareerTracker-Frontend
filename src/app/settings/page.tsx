"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  Laptop,
  Link2,
  Lock,
  Moon,
  Shield,
  Smartphone,
  Sun,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, SectionLabel } from "@/components/ui/badge";
import { SkeletonRows } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import {
  connectLinkedAccount,
  disconnectLinkedAccount,
  getCurrentFirebaseUser,
  readLinkedProviderIds,
  subscribeFirebaseIdentity,
} from "@/lib/firebase/client";
import {
  useRevokeSession,
  useSessions,
} from "@/hooks/use-api";
import { describeError } from "@/lib/errors";
import { relativeTime } from "@/lib/utils";
import type { SessionRecord } from "@/types";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";

/** The backend masks nothing in dev — loopback traffic means "this network". */
function sessionLocation(ipAddress: string | null): string | null {
  if (!ipAddress) return null;
  return /^(127\.|::1)/.test(ipAddress) ? "This network" : ipAddress;
}

function deviceLabel(session: SessionRecord): string {
  return session.device ?? "Unknown device";
}

/* ------------------------------------------------------------- */
/* Linked Accounts — the only place a login provider is connected */
/* ------------------------------------------------------------- */

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  const { signOut } = useAuth();
  const [twoFactor, setTwoFactor] = useState(true);
  const [productEmails, setProductEmails] = useState(false);

  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useSessions();
  const revokeSession = useRevokeSession();
  const [sessionBanner, setSessionBanner] = useState<{
    tone: "good" | "bad";
    text: string;
  } | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  /* -------- Linked accounts (Firebase identity providers) -------- */
  const [identity, setIdentity] = useState<{
    available: boolean;
    methods: string[];
  } | null>(null);
  const [linkedBanner, setLinkedBanner] = useState<{
    tone: "good" | "bad";
    text: string;
  } | null>(null);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);

  // Firebase runs with in-memory persistence: the identity session lives for
  // the current page visit only. After a hard reload there is no Firebase
  // user until the next sign-in — shown honestly, never papered over.
  // Subscribing (not a synchronous effect body) keeps every state change
  // (sign-in, link, unlink) flowing into this page via Firebase itself.
  const refreshIdentity = useCallback(() => {
    const user = getCurrentFirebaseUser();
    setIdentity(
      user
        ? { available: true, methods: readLinkedProviderIds(user) }
        : { available: false, methods: [] },
    );
  }, []);

  useEffect(
    () => subscribeFirebaseIdentity((user) => {
      setIdentity(
        user
          ? { available: true, methods: readLinkedProviderIds(user) }
          : { available: false, methods: [] },
      );
    }),
    [],
  );

  const showLinkedBanner = (tone: "good" | "bad", text: string) => {
    setLinkedBanner({ tone, text });
    window.setTimeout(() => setLinkedBanner(null), 5000);
  };

  const onConnectProvider = async (providerId: string, label: string) => {
    if (linkBusy) return; // one linking popup at a time
    setLinkBusy(providerId);
    try {
      const methods = await connectLinkedAccount(
        providerId as "google.com" | "github.com",
      );
      setIdentity({ available: true, methods });
      setConfirmUnlinkId(null);
      showLinkedBanner(
        "good",
        `${label} is now connected — you can sign in with it from the login screen.`,
      );
    } catch (error) {
      showLinkedBanner(
        "bad",
        (error as { message?: string }).message ??
          `We couldn't connect ${label}.`,
      );
      // Repairs state for outcomes like "already linked" without merging.
      refreshIdentity();
    } finally {
      setLinkBusy(null);
    }
  };

  const onDisconnectProvider = async (providerId: string, label: string) => {
    if (linkBusy) return;
    setLinkBusy(providerId);
    try {
      const methods = await disconnectLinkedAccount(
        providerId as "google.com" | "github.com",
      );
      setIdentity({ available: true, methods });
      setConfirmUnlinkId(null);
      showLinkedBanner(
        "good",
        `${label} is no longer connected. Your CareerTracker account and data are unchanged.`,
      );
    } catch (error) {
      showLinkedBanner(
        "bad",
        (error as { message?: string }).message ??
          `We couldn't disconnect ${label}.`,
      );
      refreshIdentity();
    } finally {
      setLinkBusy(null);
    }
  };

  const [linkedRows] = useState([
    {
      id: "google.com" as const,
      label: "Google",
      Mark: GoogleMark,
      blurb: "Sign in with your Google account",
    },
    {
      id: "github.com" as const,
      label: "GitHub",
      Mark: GitHubMark,
      blurb: "Sign in with your GitHub account",
    },
  ]);

  const showSessionBanner = (tone: "good" | "bad", text: string) => {
    setSessionBanner({ tone, text });
    window.setTimeout(() => setSessionBanner(null), 4000);
  };

  const onRevoke = async (session: SessionRecord) => {
    try {
      await revokeSession.mutateAsync(session.id);
      setConfirmRevokeId(null);
      showSessionBanner("good", `${deviceLabel(session)} has been signed out.`);
    } catch (error) {
      showSessionBanner(
        "bad",
        describeError(error, "We couldn't sign that device out. Try again in a moment."),
      );
    }
  };

  const otherSessions = (sessions ?? []).filter((session) => !session.isCurrent);

  const onSignOutEverywhere = async () => {
    if (otherSessions.length === 0) {
      showSessionBanner(
        "good",
        "You're already signed in on this device only.",
      );
      setConfirmSignOutAll(false);
      return;
    }

    setRevokingAll(true);
    const results = await Promise.allSettled(
      otherSessions.map((session) => revokeSession.mutateAsync(session.id)),
    );
    const revokedCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - revokedCount;
    setRevokingAll(false);
    setConfirmSignOutAll(false);

    if (revokedCount > 0) {
      showSessionBanner(
        failedCount === 0 ? "good" : "bad",
        failedCount === 0
          ? `Signed out on ${revokedCount} device${revokedCount === 1 ? "" : "s"}. This device stays signed in.`
          : `Signed out on ${revokedCount} device${revokedCount === 1 ? "" : "s"}. ${failedCount} couldn't be revoked.`,
      );
    } else {
      showSessionBanner(
        "bad",
        describeError(
          results[0].status === "rejected" ? results[0].reason : null,
          "We couldn't sign the other devices out. Try again in a moment.",
        ),
      );
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title={
          <>
            Account, appearance and <span className="italic text-navy">privacy</span>
          </>
        }
        description="Control how CareerTracker looks, what it sends you, and how your data is stored and exported."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {/* Appearance */}
          <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="border-b border-rule px-7 py-5">
              <h2 className="text-[13px] font-semibold text-ink">Appearance</h2>
              <p className="mt-1.5 text-[9.5px] text-warm">
                Your theme choice is stored on this device and applied before the page paints.
              </p>
            </div>

            <div className="px-7 py-8">
              <p className="label-caps mb-4">Theme</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    id: "light",
                    label: "Light",
                    icon: Sun,
                    preview: "bg-[#f7f6f3]",
                  },
                  {
                    id: "dark",
                    label: "Dark",
                    icon: Moon,
                    preview: "bg-[#12141a]",
                  },
                  {
                    id: "system",
                    label: "System",
                    icon: Laptop,
                    preview: "bg-gradient-to-r from-[#f7f6f3] to-[#12141a]",
                  },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setTheme(option.id === "dark" ? "dark" : "light")
                    }
                    className={cn(
                      "overflow-hidden rounded-[11px] border-2 text-left transition-colors",
                      (option.id === "dark" ? "dark" : "light") === theme
                        ? "border-navy"
                        : "border-rule hover:border-navy/45",
                    )}
                    aria-pressed={(option.id === "dark" ? "dark" : "light") === theme}
                  >
                    <div className={cn("h-[72px] w-full", option.preview)}>
                      <div className="flex h-full flex-col justify-center gap-2 px-4">
                        <div className="h-[7px] w-[62%] rounded-full bg-black/12 dark:bg-white/16" />
                        <div className="h-[7px] w-[42%] rounded-full bg-black/12 dark:bg-white/16" />
                        <div className="h-[16px] w-[38%] rounded-[5px] bg-[#1b3a57]" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 px-4 py-3.5">
                      <option.icon className="h-[13px] w-[13px] text-warm" aria-hidden="true" />
                      <span className="text-[10.5px] font-medium text-ink">{option.label}</span>
                      {(option.id === "dark" ? "dark" : "light") === theme && (
                        <CheckCircle2
                          className="ml-auto h-[13px] w-[13px] text-navy"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-9 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="label-caps mb-3">Interface density</p>
                  <div className="flex items-center gap-1.5 rounded-[10px] border border-rule p-1">
                    {["Comfortable", "Compact"].map((density, i) => (
                      <button
                        key={density}
                        type="button"
                        className={cn(
                          "flex-1 rounded-[7px] px-3.5 py-2 text-[10px] font-medium transition-colors",
                          i === 0
                            ? "bg-navy text-white"
                            : "text-warm hover:bg-navy-wash/50 hover:text-ink",
                        )}
                        aria-pressed={i === 0}
                      >
                        {density}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label-caps mb-3">Reduced motion</p>
                  <div className="flex items-center justify-between rounded-[10px] border border-rule px-4 py-3">
                    <div>
                      <p className="text-[10px] font-medium text-ink">Follow system setting</p>
                      <p className="mt-1 text-[8.5px] text-warm">
                        Currently respecting your OS preference
                      </p>
                    </div>
                    <span className="rounded-full bg-good-wash px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.11em] text-good">
                      Enabled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="border-b border-rule px-7 py-5">
              <h2 className="text-[13px] font-semibold text-ink">Security</h2>
              <p className="mt-1.5 text-[9.5px] text-warm">
                Sessions, credentials and account protection
              </p>
            </div>

            <div className="divide-y divide-rule">
              <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                    <KeyRound className="h-[14px] w-[14px] text-navy" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink">Password</p>
                    <p className="mt-1.5 text-[9px] text-warm">
                      Last changed 34 days ago · stored with Argon2id hashing
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-base h-[34px] rounded-[9px] border border-rule-strong px-3.5 text-[10px] font-medium text-ink hover:border-navy hover:text-navy"
                >
                  Change password
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                    <Shield className="h-[14px] w-[14px] text-navy" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-medium text-ink">
                        Two-factor authentication
                      </p>
                      {twoFactor && (
                        <Badge tone="good" className="px-2 py-0.5 text-[7.5px]">
                          On
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-[9px] text-warm">
                      Adds a verification code at sign-in from a new device
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFactor((v) => !v)}
                  role="switch"
                  aria-checked={twoFactor}
                  aria-label="Two-factor authentication"
                  className={cn(
                    "relative h-[22px] w-[38px] rounded-full border transition-colors",
                    twoFactor ? "border-navy bg-navy" : "border-rule-strong bg-paper-2",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-200",
                      twoFactor ? "left-[19px]" : "left-[2px]",
                    )}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                    <Lock className="h-[14px] w-[14px] text-navy" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink">Active sessions</p>
                    <p className="mt-1.5 text-[9px] text-warm">
                      {sessionsLoading
                        ? "Checking your devices…"
                        : sessionsError
                          ? "Couldn't reach your sessions right now"
                          : `${sessions?.length ?? 0} device${(sessions?.length ?? 0) === 1 ? "" : "s"} currently signed in`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    confirmSignOutAll
                      ? void onSignOutEverywhere()
                      : setConfirmSignOutAll(true)
                  }
                  disabled={revokingAll || sessionsLoading || sessionsError}
                  className={cn(
                    "btn-base h-[34px] rounded-[9px] border px-3.5 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-60",
                    confirmSignOutAll
                      ? "border-bad bg-bad-wash text-bad"
                      : "border-bad/30 bg-bad-wash/50 text-bad hover:bg-bad-wash",
                  )}
                >
                  {revokingAll
                    ? "Signing out…"
                    : confirmSignOutAll
                      ? `Confirm (${otherSessions.length} other)`
                      : "Sign out everywhere"}
                </button>
              </div>
            </div>

            {/* Sessions */}
            <div className="border-t border-rule px-7 py-6">
              <p className="label-caps mb-4">Signed-in devices</p>

              {sessionBanner && (
                <div
                  role={sessionBanner.tone === "good" ? "status" : "alert"}
                  className={cn(
                    "mb-4 flex items-center gap-3 rounded-[10px] border px-4 py-3",
                    sessionBanner.tone === "good"
                      ? "border-good/25 bg-good-wash"
                      : "border-bad/25 bg-bad-wash",
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "h-[13px] w-[13px] shrink-0",
                      sessionBanner.tone === "good" ? "text-good" : "text-bad",
                    )}
                    aria-hidden="true"
                  />
                  <p
                    className={cn(
                      "text-[10.5px]",
                      sessionBanner.tone === "good" ? "text-good" : "text-bad",
                    )}
                  >
                    {sessionBanner.text}
                  </p>
                </div>
              )}

              {sessionsLoading ? (
                <div className="space-y-2.5">
                  <SkeletonRows rows={2} />
                </div>
              ) : sessionsError ? (
                <div className="rounded-[10px] border border-rule px-4 py-3.5">
                  <p className="text-[10.5px] text-warm">
                    {"We couldn't load your signed-in devices."}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetchSessions()}
                    className="mt-2 text-[9.5px] font-semibold text-navy underline-offset-4 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : (sessions ?? []).length === 0 ? (
                <p className="text-[10px] text-warm">
                  {"No active sessions found. You'll see this device listed here after signing in."}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {(sessions ?? []).map((session) => {
                    const DeviceIcon = session.deviceKind === "desktop" ? Laptop : Smartphone;
                    const location = sessionLocation(session.ipAddress);
                    const isRevoking = revokeSession.isPending && revokeSession.variables === session.id;
                    const revoking = isRevoking || (revokingAll && !session.isCurrent);

                    return (
                      <div
                        key={session.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-rule px-4 py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <DeviceIcon
                            className="h-[14px] w-[14px] text-warm"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-[10px] font-medium text-ink">
                              {deviceLabel(session)}
                              {session.rememberMe && (
                                <span className="ml-2 text-[8.5px] font-normal text-warm-2">
                                  keep me signed in
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-[8.5px] text-warm">
                              {[location, relativeTime(session.lastUsedAt)]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>

                        {session.isCurrent ? (
                          <div className="flex items-center gap-3">
                            <Badge tone="good" className="px-2.5 py-1 text-[8px]">
                              This device
                            </Badge>
                            <button
                              type="button"
                              onClick={() => void signOut()}
                              className="text-[9px] font-medium text-ink underline-offset-4 hover:underline"
                            >
                              Sign out
                            </button>
                          </div>
                        ) : confirmRevokeId === session.id ? (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => void onRevoke(session)}
                              disabled={revoking}
                              className="text-[9px] font-semibold text-bad underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {revoking ? "Signing out…" : "Confirm revoke"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeId(null)}
                              className="text-[9px] font-medium text-warm underline-offset-4 hover:underline"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeId(session.id)}
                            disabled={revoking}
                            className="text-[9px] font-medium text-bad underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {revoking ? "Signing out…" : "Revoke"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Linked Accounts */}
          <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="border-b border-rule px-7 py-5">
              <h2 className="text-[13px] font-semibold text-ink">Linked Accounts</h2>
              <p className="mt-1.5 text-[9.5px] text-warm">
                Connect providers to the same account — one profile, one data set, every way to sign in
              </p>
            </div>

            <div className="px-7 py-6">
              {linkedBanner && (
                <div
                  role={linkedBanner.tone === "good" ? "status" : "alert"}
                  className={cn(
                    "mb-4 flex items-center gap-3 rounded-[10px] border px-4 py-3",
                    linkedBanner.tone === "good"
                      ? "border-good/25 bg-good-wash"
                      : "border-bad/25 bg-bad-wash",
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "h-[13px] w-[13px] shrink-0",
                      linkedBanner.tone === "good" ? "text-good" : "text-bad",
                    )}
                    aria-hidden="true"
                  />
                  <p
                    className={cn(
                      "text-[10.5px]",
                      linkedBanner.tone === "good" ? "text-good" : "text-bad",
                    )}
                  >
                    {linkedBanner.text}
                  </p>
                </div>
              )}

              {identity === null ? (
                <div className="space-y-2.5">
                  <SkeletonRows rows={1} />
                </div>
              ) : !identity.available ? (
                <div className="flex items-start gap-3 rounded-[10px] border border-rule px-4 py-3.5">
                  <Link2 className="mt-[1px] h-[13px] w-[13px] shrink-0 text-warm" aria-hidden="true" />
                  <p className="text-[10px] leading-[1.66] text-warm">
                    Your identity-provider session isn&apos;t active in this tab.
                    Sign in again, then open Settings → Linked Accounts to
                    connect or unlink providers.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-rule">
                  {linkedRows.map((row) => {
                    const connected = identity.methods.includes(row.id);
                    const onlyMethod =
                      identity.methods.length === 1 && connected;
                    const busy = linkBusy === row.id;

                    return (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-paper-2">
                            <row.Mark className="h-[15px] w-[15px] text-ink" />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-ink">{row.label}</p>
                            <p className="mt-1.5 text-[9px] text-warm">
                              {connected
                                ? "Connected — sign in with this provider any time"
                                : row.blurb}
                            </p>
                          </div>
                        </div>

                        {connected ? (
                          confirmUnlinkId === row.id ? (
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => void onDisconnectProvider(row.id, row.label)}
                                disabled={busy || onlyMethod}
                                className="text-[9px] font-semibold text-bad underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy ? "Removing…" : "Confirm remove"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmUnlinkId(null)}
                                className="text-[9px] font-medium text-warm underline-offset-4 hover:underline"
                              >
                                Keep
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Badge tone="good" className="px-2.5 py-1 text-[8px]">
                                Connected
                              </Badge>
                              <button
                                type="button"
                                onClick={() => setConfirmUnlinkId(row.id)}
                                disabled={busy || onlyMethod}
                                title={
                                  onlyMethod
                                    ? "Your only sign-in method — connect another provider first"
                                    : undefined
                                }
                                className="text-[9px] font-medium text-bad underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busy ? "Removing…" : "Disconnect"}
                              </button>
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => void onConnectProvider(row.id, row.label)}
                            disabled={Boolean(linkBusy)}
                            className="btn-base h-[34px] rounded-[9px] border border-rule-strong px-3.5 text-[10px] font-medium text-ink hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? "Connecting…" : `Connect ${row.label}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Data */}
          <section className="overflow-hidden rounded-[13px] border border-rule bg-panel">
            <div className="border-b border-rule px-7 py-5">
              <h2 className="text-[13px] font-semibold text-ink">Data & privacy</h2>
              <p className="mt-1.5 text-[9.5px] text-warm">
                Your data belongs to you — export it or remove it at any time
              </p>
            </div>

            <div className="grid gap-5 px-7 py-8 sm:grid-cols-2">
              <div className="rounded-[11px] border border-rule p-5">
                <Database className="h-[15px] w-[15px] text-navy" aria-hidden="true" />
                <p className="mt-4 text-[10.5px] font-medium text-ink">Export your data</p>
                <p className="mt-2 text-[9px] leading-[1.72] text-warm">
                  Download everything CareerTracker stores about you — profile, resume analyses,
                  skills, roadmap and application history — as JSON and CSV.
                </p>
                <button
                  type="button"
                  className="btn-base mt-4 h-[32px] rounded-[8px] border border-rule-strong px-3.5 text-[9px] font-medium text-ink hover:border-navy hover:text-navy"
                >
                  <Download className="h-[11px] w-[11px]" aria-hidden="true" />
                  Request export
                </button>
              </div>

              <div className="rounded-[11px] border border-bad/25 bg-bad-wash/32 p-5">
                <Trash2 className="h-[15px] w-[15px] text-bad" aria-hidden="true" />
                <p className="mt-4 text-[10.5px] font-medium text-ink">Delete account</p>
                <p className="mt-2 text-[9px] leading-[1.72] text-warm">
                  Permanently removes your account and every associated record. This cannot be
                  undone — export your data first if you want to keep it.
                </p>
                <button
                  type="button"
                  className="btn-base mt-4 h-[32px] rounded-[8px] border border-bad/30 px-3.5 text-[9px] font-medium text-bad hover:bg-bad-wash"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Side rail */}
        <aside className="space-y-6">
          <div className="rounded-[13px] border border-rule bg-panel p-6">
            <SectionLabel index="01" rule={false}>
              Email notifications
            </SectionLabel>
            <div className="mt-5 space-y-4">
              {[
                {
                  label: "Deadline reminders",
                  desc: "Tasks due within 3 days",
                  enabled: true,
                  toggle: () => {},
                },
                {
                  label: "Weekly progress report",
                  desc: "Sent every Monday morning",
                  enabled: true,
                  toggle: () => {},
                },
                {
                  label: "Product updates",
                  desc: "New features and improvements",
                  enabled: productEmails,
                  toggle: () => setProductEmails((v) => !v),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-ink">{item.label}</p>
                    <p className="mt-1 text-[8.5px] leading-[1.62] text-warm">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={item.toggle}
                    role="switch"
                    aria-checked={item.enabled}
                    aria-label={item.label}
                    className={cn(
                      "relative h-[20px] w-[34px] shrink-0 rounded-full border transition-colors",
                      item.enabled ? "border-navy bg-navy" : "border-rule-strong bg-paper-2",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200",
                        item.enabled ? "left-[17px]" : "left-[2px]",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[13px] border border-navy/18 bg-navy-wash/42 p-6">
            <Shield className="h-[15px] w-[15px] text-navy" aria-hidden="true" />
            <h3 className="mt-4 text-[11px] font-semibold text-ink">How your data is handled</h3>
            <ul className="mt-3.5 space-y-2.5">
              {[
                "Passwords are hashed with Argon2id — never stored in plain text",
                "Sessions use HTTP-only secure cookies that JavaScript can't read",
                "API keys and provider credentials stay server-side only",
                "Access and refresh tokens are never written to application logs",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-[1px] h-[10px] w-[10px] shrink-0 text-navy"
                    aria-hidden="true"
                  />
                  <span className="text-[8.5px] leading-[1.72] text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
