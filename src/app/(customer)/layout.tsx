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
import { RoleTheme } from "@/components/role-theme";

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
    <RoleTheme>
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-white/40 glass flex items-center px-6 gap-6">
        {/* Logo */}
        <Link href="/catalog" className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'var(--role-gradient)' }}>
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
                ? "text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/40"
            )}
            style={pathname === "/catalog" ? { background: 'hsl(var(--neon))' } : undefined}
          >
            <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
            Products
          </Link>
          <Link
            href="/catalog/orders"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium transition-all duration-200 rounded-full",
              pathname.startsWith("/catalog/orders")
                ? "text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/40"
            )}
            style={pathname.startsWith("/catalog/orders") ? { background: 'hsl(var(--neon))' } : undefined}
          >
            <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.5} />
            My Orders
          </Link>
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white/40 backdrop-blur-sm border border-white/40 rounded-full">
              <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-[12px] font-medium">
                {session.user.name}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground rounded-full hover:bg-white/40 transition-all duration-200"
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
    </RoleTheme>
  );
}
