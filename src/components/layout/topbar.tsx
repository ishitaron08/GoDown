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
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
      {/* Title */}
      <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
        {title}
      </h1>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-8 pl-9 pr-12 text-[13px] bg-secondary/60 border border-transparent placeholder:text-muted-foreground/50 focus:outline-none focus:border-border focus:bg-white transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center px-1.5 text-[10px] font-mono text-muted-foreground/60 border border-border/60">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="relative h-8 w-8 flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-neon rounded-full" />
        </button>

        <div className="h-5 w-px bg-border mx-2" />

        <div className="flex items-center gap-2.5 px-2 py-1 hover:bg-secondary transition-colors cursor-default">
          <div className="h-7 w-7 flex items-center justify-center bg-foreground text-background text-[11px] font-medium">
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
