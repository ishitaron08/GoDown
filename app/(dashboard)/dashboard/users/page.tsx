"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Shield, ShieldCheck, ShieldAlert, Eye, UserCog, Loader2,
  Users as UsersIcon, AlertTriangle, X, ChevronRight, Lock, Mail,
  User, Calendar, RefreshCw, Database, Building2, CheckCircle2, Info,
  ArrowRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface UserRole { id: string; name: string; description: string | null; }
interface UserItem {
  id: string; name: string | null; email: string;
  tenantId: string; createdAt: string; updatedAt: string; roles: UserRole[];
}
interface RoleOption {
  id: string; name: string; description: string | null;
  permissions: { action: string }[];
}

const ROLE_COLORS: Record<string, string> = {
  Admin:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  Manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  Clerk:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  Viewer:  "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};
const ROLE_ICONS: Record<string, typeof Shield> = {
  Admin: ShieldAlert, Manager: ShieldCheck, Clerk: Shield, Viewer: Eye,
};
const ROLE_ACCESS: Record<string, string> = {
  Admin:   "Full access — all modules + user management",
  Manager: "Full access — all modules except user management",
  Clerk:   "Limited access — view all, create orders/consumers/POs",
  Viewer:  "Read-only — view all modules, no create/edit/delete",
};

function FieldRow({ icon: Icon, label, value, mono = false }: {
  icon: typeof Mail; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors group">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 shrink-0 group-hover:bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn("text-sm mt-0.5 break-all", mono && "font-mono text-xs")}>{value}</p>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeUser, setActiveUser] = useState<UserItem | null>(null);
  const [pendingRoleId, setPendingRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally { setLoading(false); }
  }, [search]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoles(data.roles);
    } catch (error) { console.error("Error fetching roles:", error); }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);
  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [fetchUsers]);

  function openProfile(user: UserItem) {
    setActiveUser(user); setPendingRoleId(user.roles[0]?.id || "");
    setSaveError(""); setSaveSuccess(false);
  }
  function closeProfile() { setActiveUser(null); setSaveError(""); setSaveSuccess(false); }

  async function handleUpdateRole() {
    if (!activeUser || !pendingRoleId) return;
    setSaving(true); setSaveError(""); setSaveSuccess(false);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeUser.id, roleId: pendingRoleId }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Failed to update role"); return; }
      const updated: UserItem = { ...activeUser, ...data.user };
      setUsers((prev) => prev.map((u) => (u.id === activeUser.id ? updated : u)));
      setActiveUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { setSaveError("Network error. Please try again."); }
    finally { setSaving(false); }
  }

  const assignableRoles = roles.filter((r) => r.name !== "Admin");
  const totalUsers   = users.length;
  const adminCount   = users.filter((u) => u.roles.some((r) => r.name === "Admin")).length;
  const managerCount = users.filter((u) => u.roles.some((r) => r.name === "Manager")).length;
  const otherCount   = totalUsers - adminCount - managerCount;
  const isCurrentUser = (u: UserItem) => u.id === session?.user?.id;
  const isAdmin = (u: UserItem) => u.roles[0]?.name === "Admin";
  const isDirty = activeUser && pendingRoleId !== activeUser.roles[0]?.id;

  // Get pending role details for comparison
  const pendingRole = roles.find((r) => r.id === pendingRoleId);
  const currentRole = activeUser ? roles.find((r) => r.id === activeUser.roles[0]?.id) : null;

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left: table */}
      <div className={cn("flex-1 min-w-0 space-y-6", activeUser && "lg:max-w-[calc(100%-424px)]")}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage team members and their access levels. Click a user to view profile and assign roles.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Total Users",      value: totalUsers,   icon: UsersIcon,   cls: "bg-primary/10 text-primary" },
            { label: "Admins",           value: adminCount,   icon: ShieldAlert, cls: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
            { label: "Managers",         value: managerCount, icon: ShieldCheck, cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
            { label: "Clerks & Viewers", value: otherCount,   icon: Shield,      cls: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
          ].map(({ label, value, icon: Icon, cls }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", cls)}><Icon className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-700 dark:text-amber-400 text-xs">
            <strong className="text-amber-800 dark:text-amber-300">Admin role is protected.</strong>{" "}
            Use <code className="text-[10px] bg-amber-100 dark:bg-amber-900 px-1 rounded">npm run db:assign-role</code> to assign it via the database only.
          </p>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">All Users</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search name or email..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Joined</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : users.map((u) => {
                  const roleName   = u.roles[0]?.name || "No Role";
                  const Icon       = ROLE_ICONS[roleName] || Shield;
                  const colorClass = ROLE_COLORS[roleName] || "bg-gray-100 text-gray-700";
                  const isActive   = activeUser?.id === u.id;
                  const isMe       = isCurrentUser(u);
                  return (
                    <TableRow key={u.id} onClick={() => openProfile(u)}
                      className={cn("cursor-pointer transition-colors", isActive && "bg-primary/5 border-l-2 border-primary")}>
                      <TableCell className="pl-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">
                            {(u.name || u.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {u.name || "Unnamed"}
                              {isMe && <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(You)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <Badge variant="outline" className={cn("text-xs border", colorClass)}>{roleName}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="pr-4">
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Right: Profile Panel */}
      {activeUser && (
        <div className="hidden lg:flex w-[400px] shrink-0 flex-col rounded-xl border bg-card shadow-sm overflow-hidden self-start sticky top-4">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-semibold">
                {(activeUser.name || activeUser.email)[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {activeUser.name || "Unnamed"}
                  {isCurrentUser(activeUser) && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(You)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{activeUser.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeProfile}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
            {/* Document fields */}
            <div className="p-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Document Fields
              </p>
              <FieldRow icon={Database}  label="_id"       value={activeUser.id}       mono />
              <FieldRow icon={Mail}      label="email"     value={activeUser.email}    />
              <FieldRow icon={Lock}      label="password"  value="••••••••••••••••••••" />
              <FieldRow icon={User}      label="name"      value={activeUser.name || "—"} />
              <FieldRow icon={Building2} label="tenantId"  value={activeUser.tenantId} mono />
              <FieldRow icon={Calendar}  label="createdAt" value={new Date(activeUser.createdAt).toLocaleString()} />
              <FieldRow icon={RefreshCw} label="updatedAt" value={new Date(activeUser.updatedAt).toLocaleString()} />
            </div>

            <div className="h-px bg-border mx-4" />

            {/* Role section */}
            <div className="p-3 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Role & Access
              </p>

              {/* Current role card */}
              <div className={cn("rounded-lg border p-3 space-y-1.5 mx-0",
                ROLE_COLORS[activeUser.roles[0]?.name || ""] || "border-border bg-muted/30")}>
                <div className="flex items-center gap-2">
                  {(() => {
                    const name = activeUser.roles[0]?.name || "No Role";
                    const Icon = ROLE_ICONS[name] || Shield;
                    return (<><Icon className="h-4 w-4 shrink-0" /><span className="font-semibold text-sm">{name}</span></>);
                  })()}
                </div>
                <p className="text-xs leading-relaxed opacity-80">
                  {ROLE_ACCESS[activeUser.roles[0]?.name || ""] || "No role assigned"}
                </p>
                {currentRole && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {currentRole.permissions.length} permissions across all modules
                  </p>
                )}
              </div>

              {/* Role changer */}
              {isCurrentUser(activeUser) ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/50 border border-dashed p-3">
                  <Info className="h-4 w-4 shrink-0" /> You cannot change your own role.
                </div>
              ) : isAdmin(activeUser) ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/50 border border-dashed p-3">
                  <Lock className="h-4 w-4 shrink-0" /> Admin role is protected. Use <code className="mx-1 text-[10px] bg-background px-1 rounded">db:assign-role</code> script.
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground px-1">Assign new role</label>
                  <Select value={pendingRoleId} onValueChange={(v) => { setPendingRoleId(v); setSaveError(""); setSaveSuccess(false); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((role) => {
                        const Icon = ROLE_ICONS[role.name] || Shield;
                        return (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              <span className="font-medium">{role.name}</span>
                              <span className="text-xs text-muted-foreground">({role.permissions.length} perms)</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Role change preview */}
                  {isDirty && pendingRole && currentRole && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Role Change</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className={cn("text-[10px] border", ROLE_COLORS[currentRole.name] || "")}>
                          {currentRole.name}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className={cn("text-[10px] border", ROLE_COLORS[pendingRole.name] || "")}>
                          {pendingRole.name}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {pendingRole.permissions.length > currentRole.permissions.length
                          ? `+${pendingRole.permissions.length - currentRole.permissions.length} more permissions`
                          : pendingRole.permissions.length < currentRole.permissions.length
                            ? `${currentRole.permissions.length - pendingRole.permissions.length} fewer permissions`
                            : "Same number of permissions"}
                      </p>
                    </div>
                  )}

                  {!isDirty && pendingRole && (
                    <p className="text-xs text-muted-foreground px-1 leading-relaxed">
                      {ROLE_ACCESS[pendingRole.name] || ""}
                    </p>
                  )}

                  {saveError && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{saveError}
                    </div>
                  )}
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Role updated! User must re-login to see changes.
                    </div>
                  )}

                  <Button className="w-full h-9" onClick={handleUpdateRole}
                    disabled={saving || !isDirty || !pendingRoleId}>
                    {saving
                      ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Saving...</>
                      : <><UserCog className="h-3.5 w-3.5 mr-2" />Update Role</>}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
