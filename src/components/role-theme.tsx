"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

/**
 * Role-based theme provider.
 *
 * Sets CSS custom properties on a wrapper <div> so that every component
 * reading --neon, --accent, --sidebar-ring, or --role-glow automatically
 * picks up the colour assigned to the current user's role.
 *
 * Roles:
 *   admin            → emerald
 *   manager          → blue
 *   staff            → amber
 *   customer         → teal  (default)
 *   delivery-partner → violet
 */

const ROLE_THEMES: Record<
  string,
  { accent: string; glow: string; gradient: string }
> = {
  admin: {
    accent: "152 69% 42%",      // emerald-600
    glow: "0 0 32px -6px hsla(152, 69%, 42%, 0.25)",
    gradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
  },
  manager: {
    accent: "217 91% 60%",      // blue-500
    glow: "0 0 32px -6px hsla(217, 91%, 60%, 0.25)",
    gradient: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
  },
  staff: {
    accent: "38 92% 50%",       // amber-500
    glow: "0 0 32px -6px hsla(38, 92%, 50%, 0.25)",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
  },
  customer: {
    accent: "172 66% 40%",      // teal-600
    glow: "0 0 32px -6px hsla(172, 66%, 40%, 0.25)",
    gradient: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
  },
  "delivery-partner": {
    accent: "271 81% 56%",      // violet-500
    glow: "0 0 32px -6px hsla(271, 81%, 56%, 0.25)",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
  },
};

const DEFAULT_THEME = ROLE_THEMES.customer;

export function RoleTheme({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "customer";

  const vars = useMemo(() => {
    const t = ROLE_THEMES[role] ?? DEFAULT_THEME;
    return {
      "--neon": t.accent,
      "--accent": t.accent,
      "--accent-foreground": "210 40% 98%",
      "--sidebar-ring": t.accent,
      "--role-glow": t.glow,
      "--role-gradient": t.gradient,
    } as React.CSSProperties;
  }, [role]);

  return (
    <div style={vars} className="contents">
      {children}
    </div>
  );
}
