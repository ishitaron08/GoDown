"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/products/new": "New Product",
  "/inventory": "Inventory",
  "/orders": "Orders",
  "/suppliers": "Suppliers",
  "/reports": "Reports",
  "/ai": "AI Assistant",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ??
    "GoDown";

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-8 glass border-b border-white/40">
      {/* Title */}
      <div>
        <h1 className="text-[16px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
          {session?.user?.name ? `Welcome back, ${session.user.name.split(' ')[0]}` : 'GoDown'}
        </p>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full h-9 pl-10 pr-14 text-[13px] bg-white/40 backdrop-blur-sm border border-white/50 rounded-full placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/70 focus:bg-white/60 focus:shadow-sm transition-all"
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center px-1.5 text-[10px] font-mono text-muted-foreground/60 bg-white/60 border border-white/40 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="relative h-9 w-9 flex items-center justify-center hover:bg-white/40 rounded-full transition-all duration-200 hover-glow">
          <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-white" style={{ background: 'hsl(var(--neon))' }} />
        </button>

        <div className="h-6 w-px bg-border/50 mx-1" />

        <div className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-white/40 rounded-xl transition-all duration-200 cursor-default hover-glow">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shadow-sm" style={{ background: 'var(--role-gradient)' }}>
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-medium leading-tight text-foreground">
              {session?.user?.name}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize leading-tight">
              {session?.user?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
