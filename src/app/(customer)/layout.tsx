"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Package,
  ClipboardList,
  LogOut,
  Search,
  ShoppingCart,
  Warehouse,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-white/40 glass flex items-center px-6 gap-6">
        {/* Logo */}
        <Link href="/catalog" className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm">
            <Warehouse className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            GoDown
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/catalog"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium transition-all duration-200 rounded-full",
              pathname === "/catalog"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
            Products
          </Link>
          <Link
            href="/catalog/orders"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium transition-all duration-200 rounded-full",
              pathname.startsWith("/catalog/orders")
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.5} />
            My Orders
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User */}
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-secondary/60 rounded-full">
              <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-[12px] font-medium">
                {session.user.name}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/60 transition-all duration-200"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
