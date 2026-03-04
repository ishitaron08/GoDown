"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  Shield,
  Loader2,
  UserCheck,
  UserX,
  Crown,
  Briefcase,
  User,
  Truck,
  ShoppingCart,
  Settings2,
  ChevronRight,
} from "lucide-react";

interface RoleInfo {
  _id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
}

interface AssignableRole {
  slug: string;
  name: string;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  roleInfo?: RoleInfo | null;
  isActive: boolean;
  createdAt: string;
  canEdit?: boolean;
  assignableRoles?: string[];
  assignableRoleDetails?: AssignableRole[];
}

const roleIcons: Record<string, React.ElementType> = {
  admin: Crown,
  manager: Briefcase,
  staff: User,
  "delivery-partner": Truck,
  customer: ShoppingCart,
};

// Fixed hierarchy descriptions for predefined roles (excluding admin)
const PREDEFINED_ROLES: {
  slug: string;
  name: string;
  icon: React.ElementType;
  level: number;
  description: string;
  canAssign: string;
}[] = [
  {
    slug: "manager",
    name: "Manager",
    icon: Briefcase,
    level: 1,
    description: "Full operational access — products, orders, inventory, suppliers. Can manage Staff, Delivery Partner & Customer roles.",
    canAssign: "Staff, Delivery Partner, Customer",
  },
  {
    slug: "staff",
    name: "Staff",
    icon: User,
    level: 2,
    description: "Day-to-day operations — view & create products, inventory, orders. Limited editing.",
    canAssign: "—",
  },
  {
    slug: "delivery-partner",
    name: "Delivery Partner",
    icon: Truck,
    level: 3,
    description: "Handles deliveries — view assigned orders with customer addresses, update delivery status, view suppliers.",
    canAssign: "—",
  },
  {
    slug: "customer",
    name: "Customer",
    icon: ShoppingCart,
    level: 4,
    description: "External users — browse the product catalog and place/track their own orders. Default for self-registration.",
    canAssign: "—",
  },
];

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewUsers = session?.user?.permissions?.includes("users:view");
  const canEditUsers = session?.user?.permissions?.includes("users:edit");
  const canDeleteUsers = session?.user?.permissions?.includes("users:delete");
  const canViewRoles = session?.user?.permissions?.includes("roles:view");

  useEffect(() => {
    if (session && !session.user?.permissions?.includes("settings:view")) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        canViewUsers ? axios.get("/api/users") : Promise.resolve({ data: [] }),
        canViewRoles ? axios.get("/api/roles") : Promise.resolve({ data: [] }),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [canViewUsers, canViewRoles]);

  useEffect(() => {
    if (session?.user?.permissions?.includes("settings:view")) fetchData();
  }, [session, fetchData]);

  const updateRole = async (userId: string, newRole: string) => {
    // Optimistically update local state so select visually changes immediately
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
    );
    try {
      await axios.patch(`/api/users/${userId}`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      fetchData();
      await updateSession();
    } catch (err: unknown) {
      // Revert on failure
      fetchData();
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to update";
      toast.error(msg);
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      await axios.patch(`/api/users/${userId}`, { isActive: !isActive });
      toast.success(isActive ? "User deactivated" : "User activated");
      fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to update";
      toast.error(msg);
    }
  };

  if (!session?.user?.permissions?.includes("settings:view")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
        <div className="h-12 w-12 flex items-center justify-center bg-secondary">
          <Shield className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium">Access Denied</p>
        <p className="text-[13px] text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Settings — User Management
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage user roles and access
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {canViewRoles && (
          <Link
            href="/settings/roles"
            className="surface p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 flex items-center justify-center bg-secondary">
                <Shield className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-semibold">Role Management</p>
                <p className="text-[11px] text-muted-foreground">
                  {roles.length} roles configured
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        )}
        <div className="surface p-4 flex items-center gap-3">
          <div className="h-9 w-9 flex items-center justify-center bg-secondary">
            <Settings2 className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[13px] font-semibold">Total Users</p>
            <p className="text-[11px] text-muted-foreground">
              {users.length} users · {users.filter((u) => u.isActive).length} active
            </p>
          </div>
        </div>
      </div>

      {/* Predefined Roles — hierarchy reference (all roles except Admin) */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1">
          Role Hierarchy
        </p>
        <p className="text-[12px] text-muted-foreground mb-4">
          Higher roles can manage anyone below them. Admin controls everything.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PREDEFINED_ROLES.map((pr) => {
            const count = users.filter((u) => u.role === pr.slug).length;
            const Icon = pr.icon;
            return (
              <div
                key={pr.slug}
                className="flex items-start gap-3 p-3 border border-border/60 rounded-sm"
              >
                <div className="h-8 w-8 flex items-center justify-center bg-secondary shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold">{pr.name}</p>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5">
                      Level {pr.level}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {count} user{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    {pr.description}
                  </p>
                  {pr.canAssign !== "—" && (
                    <p className="text-[11px] text-foreground/70 mt-1">
                      <span className="font-medium">Can assign:</span> {pr.canAssign}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      {canViewUsers && (
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-6">
                <div className="skeleton h-4 w-28 rounded-sm" />
                <div className="skeleton h-4 w-36 rounded-sm" />
                <div className="skeleton h-4 w-16 rounded-sm" />
                <div className="skeleton h-4 w-14 rounded-sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  {["User", "Email", "Role", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u._id === session?.user.id;
                  const RoleIcon = roleIcons[u.role] ?? Shield;
                  return (
                    <tr
                      key={u._id}
                      className="border-t border-black/[0.03] hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 flex items-center justify-center bg-foreground text-background text-[11px] font-medium shrink-0">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {u.name}
                            {isSelf && (
                              <span className="ml-1.5 text-[11px] text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {u.email}
                      </td>
                      <td className="px-6 py-3.5">
                        {isSelf || !canEditUsers || !u.canEdit ? (
                          <span className="chip">
                            <RoleIcon className="h-3 w-3" />
                            {u.roleInfo?.name ?? u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => updateRole(u._id, e.target.value)}
                            className="px-2 py-1 text-[12px] border border-border focus:outline-none focus:border-foreground/20 transition-colors"
                          >
                            {/* Always show the user's current role (even if not assignable) */}
                            {!u.assignableRoles?.includes(u.role) && (
                              <option value={u.role}>
                                {u.roleInfo?.name ?? u.role}
                              </option>
                            )}
                            {/* Use assignableRoleDetails from API — no dependency on roles:view */}
                            {(u.assignableRoleDetails ?? []).map((r) => (
                              <option key={r.slug} value={r.slug}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`chip ${
                            u.isActive ? "chip-neon" : "chip-danger"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <UserCheck className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3" /> Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {!isSelf && canDeleteUsers && u.canEdit && (
                          <button
                            onClick={() => toggleActive(u._id, u.isActive)}
                            className="text-[12px] font-medium px-3 py-1 border border-border hover:bg-secondary transition-colors btn-press"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
