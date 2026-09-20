import { create } from "zustand";

type Theme = "light" | "dark";

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("ct-theme", theme);
  } catch {
    /* storage unavailable — theme still applies for the session */
  }
}

const initialTheme: Theme =
  typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme,
  sidebarCollapsed: false,
  mobileNavOpen: false,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));

interface OnboardingState {
  step: number;
  answers: Record<string, string | number | string[]>;
  setAnswer: (key: string, value: string | number | string[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 0,
  answers: {},
  setAnswer: (key, value) => set((s) => ({ answers: { ...s.answers, [key]: value } })),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
  reset: () => set({ step: 0, answers: {} }),
}));
