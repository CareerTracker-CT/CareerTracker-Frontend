"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#readiness", label: "Career readiness" },
  { href: "/#resume", label: "Resume intelligence" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#assistant", label: "AI assistant" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-rule bg-paper/88 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[68px] w-full max-w-[1240px] items-center justify-between px-6 lg:px-10">
        <Link href="/" aria-label="CareerTracker home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-[8px] px-3 py-2 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-navy-wash/50 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle compact />
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-[10px] px-3.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="btn-base h-9 rounded-[10px] bg-navy px-4 text-[13.5px] font-medium text-white hover:bg-navy-dark dark:bg-navy dark:text-[#0d1117]"
          >
            Get started
            <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-rule text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-rule bg-paper lg:hidden"
          >
            <nav className="flex flex-col px-6 py-4" aria-label="Mobile">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="border-b border-rule py-3 text-[15px] font-medium text-ink last:border-0"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-[10px] bg-navy text-[14px] font-medium text-white"
              >
                Sign in
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
