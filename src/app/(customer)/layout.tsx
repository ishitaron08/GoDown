"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  Package,
  ClipboardList,
  LogOut,
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/catalog", icon: Package, label: "Products", name: "Products" },
    { href: "/catalog/orders", icon: ClipboardList, label: "Orders", name: "My Orders" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 h-12 md:h-14 border-b border-border bg-white flex items-center px-3 md:px-6 gap-3 md:gap-6">
        {/* Logo */}
        <Link href="/catalog" className="flex items-center gap-2 shrink-0">
          <Warehouse className="h-4 w-4 md:h-5 md:w-5 text-neon" strokeWidth={1.5} />
          <span className="text-[13px] md:text-[15px] font-semibold tracking-tight hidden md:inline">
            GoDown
          </span>
        </Link>

        {/* Desktop Nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-colors rounded-md",
                pathname === item.href || (item.href !== "/catalog" && pathname.startsWith(item.href))
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 hover:bg-secondary rounded-md transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          )}
        </button>

        {/* Desktop User Section */}
        {session?.user && (
          <div className="hidden md:flex items-center gap-3">
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

        {/* Mobile User Avatar */}
        {session?.user && (
          <div className="md:hidden flex items-center gap-1">
            <div className="flex items-center justify-center h-8 w-8 bg-secondary rounded-md">
              <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-secondary border-b border-border px-3 py-3 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors",
                pathname === item.href || (item.href !== "/catalog" && pathname.startsWith(item.href))
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-background"
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          ))}
          <hr className="my-2 border-border" />
          {session?.user && (
            <>
              <div className="px-3 py-2 text-[12px] font-medium text-muted-foreground">
                {session.user.name}
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/auth/login" });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                Sign Out
              </button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-3 md:px-6 py-4 md:py-6">
        {children}
      </main>
    </div>
  );
}
