"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  ChevronLeft,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Target,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useUIStore } from "@/store/ui";
import { useDashboard, useNotifications } from "@/hooks/use-api";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/progress", label: "Progress", icon: LineChart },
    ],
  },
  {
    title: "Prepare",
    items: [
      { href: "/resume", label: "Resume", icon: FileText },
      { href: "/skills", label: "Skills", icon: Target },
      { href: "/roadmap", label: "Roadmap", icon: Sparkles },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/learning", label: "Learning", icon: GraduationCap },
      { href: "/interviews", label: "Interviews", icon: MessageSquare },
    ],
  },
  {
    title: "Track",
    items: [
      { href: "/applications", label: "Applications", icon: LineChart },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: User },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-[68px] items-center justify-between px-5", sidebarCollapsed && "justify-center px-0")}>
        <Link href="/dashboard" aria-label="CareerTracker dashboard" onClick={onNavigate}>
          {sidebarCollapsed ? (
            <Wordmark monogramSize={26} className="justify-center" />
          ) : (
            <Wordmark monogramSize={26} />
          )}
        </Link>
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-8 w-8 items-center justify-center rounded-[8px] text-warm transition-colors hover:bg-navy-wash/50 hover:text-ink lg:flex"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-[16px] w-[16px]" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-6" aria-label="Application">
        {!sidebarCollapsed && (
          <Link
            href="/assistant"
            onClick={onNavigate}
            className={cn(
              "group mb-5 flex items-center gap-3 rounded-[11px] border px-3.5 py-3 transition-colors",
              pathname === "/assistant"
                ? "border-navy/25 bg-navy text-white"
                : "border-navy/16 bg-navy-wash/50 text-navy hover:bg-navy-wash",
            )}
          >
            <Bot className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold leading-tight">AI Assistant</p>
              <p className="mt-0.5 truncate text-[10px] opacity-70">Ask what to do next</p>
            </div>
            <Sparkles
              className="ml-auto h-[13px] w-[13px] shrink-0 opacity-60"
              aria-hidden="true"
            />
          </Link>
        )}

        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            {!sidebarCollapsed && (
              <p className="label-caps mb-2.5 px-3 text-[9px]">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-[9px] px-3 py-[9px] text-[12.5px] font-medium transition-colors",
                        sidebarCollapsed && "justify-center px-0",
                        active
                          ? "bg-navy-wash text-navy dark:bg-navy-wash/40"
                          : "text-warm hover:bg-navy-wash/40 hover:text-ink",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 h-[18px] w-[2.5px] -translate-y-1/2 rounded-full bg-navy"
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        />
                      )}
                      <item.icon
                        className={cn("h-[16px] w-[16px] shrink-0", active && "text-navy")}
                        strokeWidth={active ? 2 : 1.7}
                        aria-hidden="true"
                      />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!sidebarCollapsed && (
        <div className="border-t border-rule p-4">
          <div className="rounded-[11px] border border-rule bg-paper-2 p-4">
            <div className="flex items-center justify-between">
              <p className="label-caps text-[9px]">Profile strength</p>
              <span className="tnum text-[11px] font-semibold text-navy">78%</span>
            </div>
            <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-rule">
              <div className="h-full w-[78%] rounded-full bg-navy" />
            </div>
            <p className="mt-2.5 text-[10.5px] leading-[1.55] text-warm">
              Add two more quantified project outcomes to reach 90%.
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-navy underline-offset-4 hover:underline"
            >
              Complete profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen, sidebarCollapsed, toggleSidebar } = useUIStore();
  const { data: dashboard } = useDashboard();
  const { data: notifications } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  const unread = notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-rule bg-panel transition-[width] duration-300 lg:block",
          sidebarCollapsed ? "w-[72px]" : "w-[252px]",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px] lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[268px] border-r border-rule bg-panel lg:hidden"
              aria-label="Mobile navigation"
            >
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-[8px] text-warm hover:bg-navy-wash/50"
                aria-label="Close navigation"
              >
                <X className="h-[17px] w-[17px]" />
              </button>
              <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn("transition-[padding] duration-300", sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[252px]")}>
        {/* Top navigation */}
        <header className="sticky top-0 z-30 border-b border-rule bg-paper/88 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-5 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule text-ink lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-[17px] w-[17px]" />
            </button>

            {sidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden h-9 w-9 items-center justify-center rounded-[9px] border border-rule text-warm transition-colors hover:border-navy hover:text-navy lg:flex"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-[16px] w-[16px]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="hidden h-9 w-full max-w-[290px] items-center gap-2.5 rounded-[9px] border border-rule bg-panel px-3 text-left text-[12.5px] text-warm-2 transition-colors hover:border-rule-strong md:flex"
              aria-label="Search CareerTracker"
            >
              <Search className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
              <span className="truncate">Search skills, tasks, applications…</span>
              <kbd className="tnum ml-auto rounded-[5px] border border-rule px-1.5 py-0.5 font-mono text-[9px] text-warm-2">
                ⌘K
              </kbd>
            </button>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  <input
                    autoFocus
                    placeholder="Search…"
                    className="field h-9 w-[180px] py-0 text-[12.5px]"
                    onBlur={() => setSearchOpen(false)}
                    aria-label="Search"
                  />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-warm hover:bg-navy-wash/50"
                    aria-label="Close search"
                  >
                    <ChevronLeft className="h-[15px] w-[15px]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="ml-auto flex items-center gap-2.5">
              <div className="hidden items-center gap-2 rounded-full border border-rule bg-panel px-3 py-1.5 sm:flex">
                <span className="h-[6px] w-[6px] rounded-full bg-warn" aria-hidden="true" />
                <span className="tnum text-[11px] font-semibold text-ink">
                  {dashboard?.user.streakDays ?? 0}
                </span>
                <span className="text-[10px] text-warm">day streak</span>
              </div>

              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-rule bg-panel text-ink-soft transition-colors hover:border-navy hover:text-navy"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              >
                <Bell className="h-[16px] w-[16px]" aria-hidden="true" />
                {unread > 0 && (
                  <span className="tnum absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-bad px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>

              <ThemeToggle compact />

              <Link
                href="/profile"
                className="flex items-center gap-2.5 rounded-[9px] border border-rule bg-panel py-1 pl-1 pr-2.5 transition-colors hover:border-navy"
                aria-label="Your profile"
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-navy text-[11px] font-semibold text-white">
                  {initials(dashboard?.user.fullName ?? "Student")}
                </span>
                <span className="hidden max-w-[110px] truncate text-[11.5px] font-medium text-ink lg:block">
                  {dashboard?.user.fullName ?? "Student"}
                </span>
              </Link>
            </div>
          </div>

          {/* Contextual AI band */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-rule bg-navy-wash/35 px-5 py-2 lg:px-8">
            <Bot className="h-[13px] w-[13px] shrink-0 text-navy" aria-hidden="true" />
            <p className="whitespace-nowrap text-[10.5px] text-navy">
              <strong className="font-semibold">Next best action: </strong>
              {dashboard?.todayTasks[0]?.title ??
                "Complete your profile to unlock personalised recommendations."}
            </p>
            <Link
              href="/roadmap"
              className="ml-auto whitespace-nowrap text-[10.5px] font-semibold text-navy underline-offset-4 hover:underline"
            >
              Open roadmap
            </Link>
          </div>
        </header>

        <main id="main-content" className="px-5 py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
