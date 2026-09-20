"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-navy text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117] dark:hover:bg-navy-dark dark:hover:text-white shadow-[0_1px_2px_rgba(20,22,25,0.08)]",
  secondary:
    "bg-panel text-ink border border-rule-strong hover:border-navy hover:text-navy dark:hover:border-navy dark:hover:text-navy",
  ghost: "bg-transparent text-ink-soft hover:bg-navy-wash/60 hover:text-ink",
  danger: "bg-bad text-white hover:opacity-90",
  link: "bg-transparent text-navy underline-offset-4 hover:underline px-0",
};

const sizes: Record<Size, string> = {
  sm: "h-[34px] px-3 text-[13px]",
  md: "h-[42px] px-[18px] text-[14px]",
  lg: "h-[50px] px-6 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    icon,
    iconRight,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("btn-base", variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
});
