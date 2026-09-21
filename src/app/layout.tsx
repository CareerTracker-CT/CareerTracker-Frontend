import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://careertracker.app"),
  title: {
    default: "CareerTracker — Track Skills. Build Your Career. Get Hired.",
    template: "%s · CareerTracker",
  },
  description:
    "CareerTracker turns your resume, skills and goals into a transparent career-readiness score and a personalised placement roadmap.",
  keywords: ["career readiness", "ATS score", "skill gap", "placement preparation", "roadmap"],
  openGraph: {
    title: "CareerTracker — Track Skills. Build Your Career. Get Hired.",
    description:
      "Understand your career readiness, close your skill gaps and know exactly what to do next.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-bootstrap"
          // Set the theme before paint so there is no flash of the wrong surface.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ct-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
