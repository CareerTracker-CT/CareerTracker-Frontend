import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Career readiness", href: "/#readiness" },
      { label: "Resume intelligence", href: "/#resume" },
      { label: "Skill gap analysis", href: "/#skill-gap" },
      { label: "Personalised roadmap", href: "/#roadmap" },
      { label: "AI career assistant", href: "/#assistant" },
    ],
  },
  {
    title: "Prepare",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Resume analysis", href: "/resume" },
      { label: "Skills", href: "/skills" },
      { label: "Interview preparation", href: "/interviews" },
      { label: "Applications", href: "/applications" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About CareerTracker", href: "/#how-it-works" },
      { label: "Methodology", href: "/#readiness" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-rule bg-paper-2">
      <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-[34ch] text-[14px] leading-[1.72] text-warm">
              CareerTracker turns your resume, skills and goals into a transparent readiness
              score and a plan you can actually follow.
            </p>
            <p className="mt-6 text-[12.5px] leading-[1.7] text-warm-2">
              Built for students preparing for their first role — with methodology you can
              inspect, not scores you have to trust blindly.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="label-caps mb-5">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-ink-soft transition-colors hover:text-navy"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-rule pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-warm-2">
            © {new Date().getFullYear()} CareerTracker. All figures shown are calculated from
            your own data.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#main-content"
              className="text-[12px] text-warm-2 transition-colors hover:text-navy"
            >
              Back to top
            </a>
            <span className="flex items-center gap-2 text-[12px] text-warm-2">
              <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden="true" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
