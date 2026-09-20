"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.").min(8, "Password must be at least 8 characters."),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.input<typeof loginSchema>;

/** Floating career nodes — subtle ambient motion, never a particle storm. */
function AmbientNodes() {
  const reduce = useReducedMotion();
  const nodes = [
    { x: 14, y: 18, label: "Skills", size: 62 },
    { x: 62, y: 12, label: "Resume", size: 56 },
    { x: 82, y: 38, label: "Roadmap", size: 68 },
    { x: 32, y: 52, label: "Projects", size: 58 },
    { x: 68, y: 72, label: "Interviews", size: 72 },
    { x: 16, y: 82, label: "Readiness", size: 76 },
    { x: 48, y: 90, label: "Learning", size: 60 },
    { x: 90, y: 88, label: "Offers", size: 52 },
  ];

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {[
        [0, 2],
        [2, 4],
        [4, 6],
        [0, 3],
        [1, 5],
        [3, 7],
        [2, 3],
        [5, 6],
      ].map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="rgba(127,178,224,0.17)"
          strokeWidth="0.16"
          initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 1.6, delay: reduce ? 0 : 0.3 + i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "aarav.sharma@vitstudent.ac.in",
      password: "CareerTracker#2026",
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginForm) => {
    setFormError(null);
    try {
      await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      router.push("/dashboard");
    } catch {
      setFormError(
        "We couldn't sign you in right now. Please check your connection and try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------- AMBIENT PANEL */}
      <aside className="relative hidden overflow-hidden bg-[#0e1620] lg:block">
        <Image
          src="/images/login-side.svg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-[0.42]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(168deg, rgba(14,22,32,0.62) 0%, rgba(14,22,32,0.9) 58%, rgba(14,22,32,0.97) 100%)",
          }}
        />

        {/* Hairline grid drift */}
        <div
          className="grid-drift absolute inset-0 opacity-[0.32]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(127,178,224,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(127,178,224,0.12) 1px, transparent 1px)",
            backgroundSize: "76px 76px",
          }}
          aria-hidden="true"
        />

        {!reduce && <AmbientNodes />}

        {/* Single slow light sweep */}
        <div className="light-sweep absolute inset-0 overflow-hidden opacity-70" aria-hidden="true" />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Link href="/" aria-label="Back to CareerTracker home">
            <Wordmark inverted monogramSize={28} />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.17em] text-[#7fb2e0]">
              Welcome back
            </p>
            <h1 className="mt-6 max-w-[15ch] text-[clamp(2.35rem,3.5vw,3.35rem)] font-semibold leading-[1.04] tracking-[-0.032em] text-white">
              Pick up where your
              <span className="italic text-[#9cc4ea]"> progress</span> left off.
            </h1>
            <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.76] text-white/58">
              Your readiness score, roadmap and skill gaps are recalculated the moment you sign in
              — so the first thing you see is what to do next.
            </p>

            <div className="mt-10 grid max-w-[420px] grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-white/9">
              {[
                { k: "Readiness", v: "62", s: "of 100" },
                { k: "Day streak", v: "12", s: "in a row" },
                { k: "Tasks done", v: "1", s: "of 12" },
              ].map((stat) => (
                <div key={stat.k} className="bg-white/[0.045] px-4 py-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/42">
                    {stat.k}
                  </p>
                  <p className="tnum mt-2 font-display text-[25px] font-semibold leading-none tracking-[-0.028em] text-white">
                    {stat.v}
                  </p>
                  <p className="mt-1 text-[9.5px] text-white/38">{stat.s}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center gap-2.5 text-[11px] text-white/38">
            <ShieldCheck className="h-[14px] w-[14px]" aria-hidden="true" />
            <span>Secure session · HTTP-only cookies · Your data is never sold</span>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------ FORM SIDE */}
      <main className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 pt-7 lg:px-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-warm transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-[15px] w-[15px]" aria-hidden="true" />
            <span className="hidden sm:inline">Back to home</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <ThemeToggle compact />
            <Link
              href="/dashboard"
              className="hidden h-9 items-center rounded-[10px] border border-rule px-3.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-navy hover:text-navy sm:inline-flex"
            >
              View demo
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
          <motion.div
            className="w-full max-w-[412px]"
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="lg:hidden">
              <Wordmark monogramSize={28} />
            </div>

            <p className="label-caps mt-10 lg:mt-0">Sign in</p>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.16] tracking-[-0.03em] text-ink">
              Continue to CareerTracker
            </h2>
            <p className="mt-2.5 text-[14px] leading-[1.66] text-warm">
              Use your student credentials, or explore the demo workspace.
            </p>

            {/* OAuth */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-base h-[44px] rounded-[10px] border border-rule-strong bg-panel text-[13.5px] font-medium text-ink hover:border-navy hover:text-navy"
              >
                <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
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
                Google
              </button>
              <button
                type="button"
                className="btn-base h-[44px] rounded-[10px] border border-rule-strong bg-panel text-[13.5px] font-medium text-ink hover:border-navy hover:text-navy"
              >
                <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
                </svg>
                GitHub
              </button>
            </div>

            <div className="my-7 flex items-center gap-4">
              <span className="h-px flex-1 bg-rule" aria-hidden="true" />
              <span className="label-caps">or with email</span>
              <span className="h-px flex-1 bg-rule" aria-hidden="true" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-[12.5px] font-medium text-ink">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  className="field"
                  aria-invalid={errors.email ? "true" : undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="mt-2 text-[11.5px] text-bad">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-[12.5px] font-medium text-ink">
                    Password
                  </label>
                  <Link
                    href="#"
                    className="text-[11.5px] font-medium text-navy underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="field pr-12"
                    aria-invalid={errors.password ? "true" : undefined}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[8px] text-warm transition-colors hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[16px] w-[16px]" aria-hidden="true" />
                    ) : (
                      <Eye className="h-[16px] w-[16px]" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="mt-2 text-[11.5px] text-bad">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-ink-soft">
                <input
                  type="checkbox"
                  className="h-[16px] w-[16px] rounded-[4px] border-rule-strong accent-[var(--navy)]"
                  {...register("rememberMe")}
                />
                Keep me signed in on this device
              </label>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-[10px] border border-bad/25 bg-bad-wash/60 px-4 py-3"
                >
                  <p className="text-[12px] leading-[1.62] text-bad">{formError}</p>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={isSubmitting}
                loadingText="Signing you in…"
                disabled={!isValid}
                iconRight={!isSubmitting ? <ArrowRight className="h-[16px] w-[16px]" /> : undefined}
              >
                Sign in
              </Button>
            </form>

            <div className="mt-6 rounded-[10px] border border-navy/18 bg-navy-wash/50 px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <Check className="mt-[1px] h-[15px] w-[15px] shrink-0 text-navy" aria-hidden="true" />
                <p className="text-[11.5px] leading-[1.66] text-navy">
                  Demo workspace pre-filled — press <strong>Sign in</strong> to explore the full
                  product with realistic student data.
                </p>
              </div>
            </div>

            <p className="mt-8 text-[12.5px] text-warm">
              New to CareerTracker?{" "}
              <Link href="/onboarding" className="font-medium text-navy underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </motion.div>
        </div>

        <div className="px-6 pb-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-6 text-[11px] text-warm-2">
            <Link href="/" className="transition-colors hover:text-navy">
              Privacy
            </Link>
            <Link href="/" className="transition-colors hover:text-navy">
              Terms
            </Link>
            <Link href="/" className="transition-colors hover:text-navy">
              Security
            </Link>
            <span className="ml-auto">© {new Date().getFullYear()} CareerTracker</span>
          </div>
        </div>
      </main>
    </div>
  );
}
