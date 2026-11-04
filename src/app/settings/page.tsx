"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  Laptop,
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
