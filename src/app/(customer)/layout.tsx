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
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-white flex items-center px-6 gap-6">
        {/* Logo */}
        <Link href="/catalog" className="flex items-center gap-2 shrink-0">
          <Warehouse className="h-5 w-5 text-neon" strokeWidth={1.5} />
          <span className="text-[15px] font-semibold tracking-tight">
            GoDown
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/catalog"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-colors rounded-md",
              pathname === "/catalog"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
            Products
          </Link>
          <Link
            href="/catalog/orders"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-colors rounded-md",
              pathname.startsWith("/catalog/orders")
                ? "bg-foreground text-background"
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md">
              <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-[12px] font-medium">
                {session.user.name}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
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
