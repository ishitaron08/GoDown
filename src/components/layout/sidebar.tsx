"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Warehouse,
  Bot,
  Shield,
  MapPin,
  Boxes,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/products", label: "Products", icon: Package, permission: "products:view" },
  { href: "/orders", label: "Orders", icon: ClipboardList, permission: "orders:view" },
  { href: "/deliveries", label: "My Deliveries", icon: Truck, permission: "deliveries:view" },
  { href: "/suppliers", label: "Delivery Partners", icon: Truck, permission: "suppliers:view" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports:view" },
  { href: "/ai", label: "AI Assistant", icon: Bot, permission: "ai:view" },
];

const godownItems: NavItem[] = [
  { href: "/warehouses", label: "All GoDowns", icon: Warehouse, permission: "warehouses:view" },
  { href: "/warehouses/inventory", label: "GoDown Inventory", icon: Boxes, permission: "warehouses:view" },
];

const adminItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:view" },
  { href: "/settings/roles", label: "Roles", icon: Shield, permission: "roles:view" },
];

function SidebarContent() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const permissions: string[] = session?.user?.permissions ?? [];
  const userRole = session?.user?.role ?? "";

  // Filter nav items: hide "Orders" and "Delivery Partners" for delivery-partner role
  const visibleNav = navItems.filter((item) => {
    if (!item.permission || !permissions.includes(item.permission)) {
      return false;
    }
    // Hide "Orders" and "Suppliers" (Delivery Partners) for delivery partners
    if (userRole === "delivery-partner" && (item.href === "/orders" || item.href === "/suppliers")) {
      return false;
    }
    return true;
  });

  const visibleGodown = godownItems.filter(
    (item) => !item.permission || permissions.includes(item.permission)
  );

  const visibleAdmin = adminItems.filter(
    (item) => !item.permission || permissions.includes(item.permission)
  );

  return (
    <aside className="w-[260px] min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-lg" style={{ background: 'var(--role-gradient)', boxShadow: '0 4px 12px -2px hsl(var(--neon) / 0.35)' }}>
            <Warehouse className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              GoDown
            </span>
            <p className="text-[10px] text-sidebar-foreground/60 leading-none">Inventory</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-6 pb-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">
            Navigation
          </p>
          <div className="space-y-1">
            {visibleNav.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                    active
                      ? "text-white"
                      : "text-sidebar-foreground hover:text-white hover:bg-white/[0.06]"
                  )}
                  style={active ? { background: 'linear-gradient(to right, hsl(var(--neon) / 0.2), hsl(var(--neon) / 0.05))', boxShadow: '0 1px 3px hsl(var(--neon) / 0.1)' } : undefined}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? ""
                        : "text-sidebar-foreground"
                    )}
                    style={active ? { color: 'hsl(var(--neon))' } : undefined}
                    strokeWidth={1.5}
                  />
                  {label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full animate-pulse-ring" style={{ background: 'hsl(var(--neon))' }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* GoDown section */}
        {visibleGodown.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">
              GoDown
            </p>
            <div className="space-y-1">
              {visibleGodown.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/warehouses"
                    ? pathname === "/warehouses" || (pathname.startsWith("/warehouses/") && pathname !== "/warehouses/inventory")
                    : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                      active
                        ? "text-white"
                        : "text-sidebar-foreground hover:text-white hover:bg-white/[0.06]"
                    )}
                    style={active ? { background: 'linear-gradient(to right, hsl(var(--neon) / 0.2), hsl(var(--neon) / 0.05))', boxShadow: '0 1px 3px hsl(var(--neon) / 0.1)' } : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "" : "text-sidebar-foreground"
                      )}
                      style={active ? { color: 'hsl(var(--neon))' } : undefined}
                      strokeWidth={1.5}
                    />
                    {label}
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full animate-pulse-ring" style={{ background: 'hsl(var(--neon))' }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin section */}
        {visibleAdmin.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">
              Admin
            </p>
            <div className="space-y-1">
              {visibleAdmin.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/settings"
                    ? pathname === "/settings"
                    : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                      active
                        ? "text-white"
                        : "text-sidebar-foreground hover:text-white hover:bg-white/[0.06]"
                    )}
                    style={active ? { background: 'linear-gradient(to right, hsl(var(--neon) / 0.2), hsl(var(--neon) / 0.05))', boxShadow: '0 1px 3px hsl(var(--neon) / 0.1)' } : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    {label}
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full animate-pulse-ring" style={{ background: 'hsl(var(--neon))' }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div>
          <a
            href="/track"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg text-sidebar-foreground hover:text-white hover:bg-white/[0.06] transition-all duration-200"
          >
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Track Order
            <svg className="h-3 w-3 ml-auto opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </a>
        </div>
      </nav>

      {/* User capsule */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-3 bg-white/[0.04] rounded-xl">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0 shadow-sm" style={{ background: 'var(--role-gradient)' }}>
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white truncate">
              {session?.user?.name}
            </p>
            <p className="text-[10px] text-sidebar-foreground capitalize leading-tight">
              {session?.user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium text-sidebar-foreground hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] h-screen bg-sidebar flex-col border-r border-sidebar-border shrink-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded hover:bg-secondary transition-colors"
      >
        {mobileOpen ? (
          <X className="h-5 w-5" strokeWidth={1.5} />
        ) : (
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        )}
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 z-40 w-[240px] h-screen bg-sidebar flex flex-col border-r border-sidebar-border overflow-hidden transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
