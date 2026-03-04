"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingCart,
  Wrench,
  UserRound,
  ClipboardList,
  TruckIcon,
  BarChart3,
  Settings,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Permission {
  id: string;
  action: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  userCount: number;
  permissions: Permission[];
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  Admin: ShieldAlert,
  Manager: ShieldCheck,
  Clerk: Shield,
  Viewer: Eye,
};

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Admin: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-900",
    text: "text-red-700 dark:text-red-400",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  Manager: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  Clerk: {
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-900",
    text: "text-green-700 dark:text-green-400",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  Viewer: {
    bg: "bg-gray-50 dark:bg-gray-950/20",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-700 dark:text-gray-400",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

const MODULE_ICONS: Record<string, typeof Package> = {
  vendor: TruckIcon,
  product: Package,
  service: Wrench,
  consumer: UserRound,
  order: ShoppingCart,
  "purchase-order": ClipboardList,
  analytics: BarChart3,
  user: Settings,
};

const MODULE_LABELS: Record<string, string> = {
  vendor: "Vendors",
  product: "Products",
  service: "Services",
  consumer: "Consumers",
  order: "Orders",
  "purchase-order": "Purchase Orders",
  analytics: "Analytics",
  user: "User Management",
};

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  manage: "Manage",
};

// Extract unique modules and actions from all permissions across all roles
function extractModulesAndActions(roles: Role[]) {
  const moduleActions: Record<string, string[]> = {};
  roles.forEach((role) => {
    role.permissions.forEach((p) => {
      const [mod, action] = p.action.split(".");
      if (!moduleActions[mod]) moduleActions[mod] = [];
      if (!moduleActions[mod].includes(action)) moduleActions[mod].push(action);
    });
  });
  // Sort actions in a logical order
  const actionOrder = ["view", "create", "edit", "delete", "manage"];
  Object.keys(moduleActions).forEach((mod) => {
    moduleActions[mod].sort((a, b) => {
      const ai = actionOrder.indexOf(a);
      const bi = actionOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  });
  return moduleActions;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "matrix">("cards");

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      setLoading(true);
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const moduleActions = extractModulesAndActions(roles);
  const moduleOrder = ["vendor", "product", "service", "consumer", "order", "purchase-order", "analytics", "user"];
  const sortedModules = Object.keys(moduleActions).sort(
    (a, b) => (moduleOrder.indexOf(a) === -1 ? 99 : moduleOrder.indexOf(a)) - (moduleOrder.indexOf(b) === -1 ? 99 : moduleOrder.indexOf(b))
  );

  function hasPermission(role: Role, module: string, action: string) {
    return role.permissions.some((p) => p.action === `${module}.${action}`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define access levels for your team. Each role has specific permissions across all modules.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/50 self-start sm:self-auto">
          {(["cards", "matrix"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                view === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "cards" ? "Role Cards" : "Permission Matrix"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {roles.map((role) => {
          const Icon = ROLE_ICONS[role.name] || Shield;
          const colors = ROLE_COLORS[role.name] || ROLE_COLORS.Viewer;
          return (
            <div key={role.id} className={cn("rounded-lg border p-4", colors.bg, colors.border)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className={cn("h-5 w-5", colors.text)} />
                  <span className="font-semibold text-sm">{role.name}</span>
                </div>
                <Badge variant="secondary" className={cn("text-xs", colors.badge)}>
                  {role.permissions.length} perms
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {role.userCount} user{role.userCount !== 1 ? "s" : ""} assigned
              </div>
            </div>
          );
        })}
      </div>

      {/* Cards View */}
      {view === "cards" && (
        <div className="space-y-4">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role.name] || Shield;
            const colors = ROLE_COLORS[role.name] || ROLE_COLORS.Viewer;
            const isExpanded = expandedRole === role.id;
            const rolePermissions = role.permissions.map((p) => p.action);

            return (
              <Card key={role.id} className="overflow-hidden">
                {/* Role Header */}
                <div
                  className={cn("cursor-pointer transition-colors hover:bg-muted/30", isExpanded && "border-b")}
                  onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colors.bg, colors.border, "border")}>
                          <Icon className={cn("h-5 w-5", colors.text)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-semibold">{role.name}</h3>
                            <div className="flex items-center gap-1.5">
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                                {role.id.slice(0, 8)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(role.id, role.id); }}
                              >
                                {copiedId === role.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                            {role.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" /> {role.permissions.length} permissions
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" /> {role.userCount} users
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {/* Expanded permissions */}
                {isExpanded && (
                  <CardContent className="pt-4 pb-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {sortedModules.map((mod) => {
                        const ModIcon = MODULE_ICONS[mod] || Package;
                        const actions = moduleActions[mod];
                        const grantedCount = actions.filter((a) => rolePermissions.includes(`${mod}.${a}`)).length;
                        const allGranted = grantedCount === actions.length;

                        return (
                          <div key={mod} className="rounded-lg border p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ModIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{MODULE_LABELS[mod] || mod}</span>
                              </div>
                              <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                allGranted
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : grantedCount > 0
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              )}>
                                {grantedCount}/{actions.length}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {actions.map((action) => {
                                const granted = rolePermissions.includes(`${mod}.${action}`);
                                return (
                                  <div key={action} className="flex items-center justify-between py-1 px-1">
                                    <span className="text-xs text-muted-foreground">
                                      {ACTION_LABELS[action] || action}
                                    </span>
                                    {granted ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5 text-red-300 dark:text-red-800" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Matrix View */}
      {view === "matrix" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                    Module / Action
                  </th>
                  {roles.map((role) => {
                    const Icon = ROLE_ICONS[role.name] || Shield;
                    const colors = ROLE_COLORS[role.name] || ROLE_COLORS.Viewer;
                    return (
                      <th key={role.id} className="p-3 text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <Icon className={cn("h-4 w-4", colors.text)} />
                          <span className="font-semibold text-xs">{role.name}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedModules.map((mod) => {
                  const ModIcon = MODULE_ICONS[mod] || Package;
                  const actions = moduleActions[mod];
                  return actions.map((action, actionIdx) => (
                    <tr key={`${mod}.${action}`} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", actionIdx === 0 && "border-t-2 border-t-border/60")}>
                      <td className="p-3 sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2.5">
                          {actionIdx === 0 && <ModIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
                          {actionIdx !== 0 && <div className="w-4" />}
                          <div>
                            {actionIdx === 0 && (
                              <p className="text-xs font-semibold text-foreground">{MODULE_LABELS[mod] || mod}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{ACTION_LABELS[action] || action}</p>
                          </div>
                        </div>
                      </td>
                      {roles.map((role) => {
                        const has = hasPermission(role, mod, action);
                        return (
                          <td key={role.id} className="p-3 text-center">
                            {has ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-200 dark:text-red-900 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
