"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  Shield,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Lock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";

// ─── Permission groups (mirrors server-side) ───
const PERMISSION_GROUPS = [
  {
    module: "dashboard",
    label: "Dashboard",
    permissions: [{ key: "dashboard:view", label: "View Dashboard" }],
  },
  {
    module: "products",
    label: "Products",
    permissions: [
      { key: "products:view", label: "View" },
      { key: "products:create", label: "Create" },
      { key: "products:edit", label: "Edit" },
      { key: "products:delete", label: "Delete" },
    ],
  },
  {
    module: "inventory",
    label: "Inventory",
    permissions: [
      { key: "inventory:view", label: "View" },
      { key: "inventory:create", label: "Add Stock" },
      { key: "inventory:edit", label: "Edit" },
    ],
  },
  {
    module: "orders",
    label: "Orders",
    permissions: [
      { key: "orders:view", label: "View" },
      { key: "orders:create", label: "Create" },
      { key: "orders:edit", label: "Edit" },
      { key: "orders:delete", label: "Delete" },
    ],
  },
  {
    module: "suppliers",
    label: "Suppliers",
    permissions: [
      { key: "suppliers:view", label: "View" },
      { key: "suppliers:create", label: "Create" },
      { key: "suppliers:edit", label: "Edit" },
      { key: "suppliers:delete", label: "Delete" },
    ],
  },
  {
    module: "categories",
    label: "Categories",
    permissions: [
      { key: "categories:view", label: "View" },
      { key: "categories:create", label: "Create" },
      { key: "categories:edit", label: "Edit" },
      { key: "categories:delete", label: "Delete" },
    ],
  },
  {
    module: "reports",
    label: "Reports",
    permissions: [
      { key: "reports:view", label: "View" },
      { key: "reports:export", label: "Export" },
    ],
  },
  {
    module: "ai",
    label: "AI Assistant",
    permissions: [
      { key: "ai:view", label: "Access" },
      { key: "ai:use", label: "Use" },
    ],
  },
  {
    module: "users",
    label: "User Management",
    permissions: [
      { key: "users:view", label: "View" },
      { key: "users:create", label: "Create" },
      { key: "users:edit", label: "Edit" },
      { key: "users:delete", label: "Deactivate" },
    ],
  },
  {
    module: "roles",
    label: "Role Management",
    permissions: [
      { key: "roles:view", label: "View" },
      { key: "roles:create", label: "Create" },
      { key: "roles:edit", label: "Edit" },
      { key: "roles:delete", label: "Delete" },
    ],
  },
  {
    module: "settings",
    label: "Settings",
    permissions: [
      { key: "settings:view", label: "View" },
      { key: "settings:edit", label: "Edit" },
    ],
  },
  {
    module: "upload",
    label: "File Upload",
    permissions: [{ key: "upload:create", label: "Upload" }],
  },
];

interface RoleItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isDefault: boolean;
  userCount?: number;
  createdAt: string;
}

interface RoleForm {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
}

const emptyForm: RoleForm = {
  name: "",
  slug: "",
  description: "",
  permissions: [],
  isDefault: false,
};

export default function RolesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // role._id or "new"
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const canEdit = session?.user?.permissions?.includes("roles:edit");
  const canCreate = session?.user?.permissions?.includes("roles:create");
  const canDelete = session?.user?.permissions?.includes("roles:delete");

  const fetchRoles = useCallback(async () => {
    try {
      const res = await axios.get("/api/roles");
      setRoles(res.data);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ─── Check permission ───
  const hasViewPerm = session?.user?.permissions?.includes("roles:view");
  if (session && !hasViewPerm) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
        <div className="h-12 w-12 flex items-center justify-center bg-secondary">
          <Shield className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium">Access Denied</p>
        <p className="text-[13px] text-muted-foreground">
          You don&apos;t have permission to manage roles.
        </p>
      </div>
    );
  }

  // ─── Form handlers ───
  const startCreate = () => {
    setEditing("new");
    setForm(emptyForm);
  };

  const startEdit = (role: RoleItem) => {
    setEditing(role._id);
    setForm({
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: [...role.permissions],
      isDefault: role.isDefault,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const togglePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const toggleModule = (module: string) => {
    const group = PERMISSION_GROUPS.find((g) => g.module === module);
    if (!group) return;
    const allKeys = group.permissions.map((p) => p.key);
    const allSelected = allKeys.every((k) => form.permissions.includes(k));
    setForm((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !allKeys.includes(p))
        : Array.from(new Set([...prev.permissions, ...allKeys])),
    }));
  };

  const selectAll = () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    setForm((prev) => ({ ...prev, permissions: all }));
  };

  const clearAll = () => {
    setForm((prev) => ({ ...prev, permissions: [] }));
  };

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    setSaving(true);
    try {
      if (editing === "new") {
        const slug = form.slug || autoSlug(form.name);
        await axios.post("/api/roles", { ...form, slug });
        toast.success("Role created");
      } else {
        await axios.patch(`/api/roles/${editing}`, form);
        toast.success("Role updated");
      }
      cancelEdit();
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to save role";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: RoleItem) => {
    if (!confirm(`Delete "${role.name}"? Users with this role will be moved to the default role.`))
      return;
    try {
      await axios.delete(`/api/roles/${role._id}`);
      toast.success("Role deleted");
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to delete";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Role Management
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Create, edit, and manage roles with granular permissions
          </p>
        </div>
        {canCreate && !editing && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors btn-press"
          >
            <Plus className="h-3.5 w-3.5" />
            New Role
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {editing && (
        <div className="surface p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">
              {editing === "new" ? "Create New Role" : "Edit Role"}
            </h2>
            <button
              onClick={cancelEdit}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Role Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: editing === "new" ? autoSlug(e.target.value) : prev.slug,
                  }));
                }}
                placeholder="e.g. Warehouse Lead"
                className="mt-1 w-full px-3 py-2 text-[13px] border border-border focus:outline-none focus:border-foreground/20 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Slug (identifier)
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="warehouse-lead"
                disabled={editing !== "new"}
                className="mt-1 w-full px-3 py-2 text-[13px] border border-border focus:outline-none focus:border-foreground/20 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Brief description of this role's purpose"
              className="mt-1 w-full px-3 py-2 text-[13px] border border-border focus:outline-none focus:border-foreground/20 transition-colors"
            />
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isDefault: e.target.checked }))
              }
              className="accent-foreground"
            />
            <span className="text-[13px]">
              Default role for new users
            </span>
          </label>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Permissions ({form.permissions.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  onClick={clearAll}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PERMISSION_GROUPS.map((group) => {
                const allKeys = group.permissions.map((p) => p.key);
                const selectedCount = allKeys.filter((k) =>
                  form.permissions.includes(k)
                ).length;
                const allSelected = selectedCount === allKeys.length;

                return (
                  <div
                    key={group.module}
                    className="border border-border p-3 space-y-2"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleModule(group.module)}
                        className="accent-foreground"
                      />
                      <span className="text-[12px] font-semibold">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {selectedCount}/{allKeys.length}
                      </span>
                    </label>
                    <div className="space-y-1 pl-1">
                      {group.permissions.map((perm) => (
                        <label
                          key={perm.key}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                            className="accent-foreground"
                          />
                          <span className="text-[12px] text-muted-foreground">
                            {perm.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 btn-press"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {editing === "new" ? "Create Role" : "Save Changes"}
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-[12px] font-medium border border-border hover:bg-secondary transition-colors btn-press"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roles list */}
      {loading ? (
        <div className="surface p-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-6">
              <div className="skeleton h-4 w-28 rounded-sm" />
              <div className="skeleton h-4 w-48 rounded-sm" />
              <div className="skeleton h-4 w-16 rounded-sm" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => {
            const isExpanded = expandedRole === role._id;

            return (
              <div key={role._id} className="surface overflow-hidden">
                {/* Role Header */}
                <div
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() =>
                    setExpandedRole(isExpanded ? null : role._id)
                  }
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 flex items-center justify-center bg-secondary shrink-0">
                      <Shield
                        className="h-4 w-4 text-foreground/60"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold">
                          {role.name}
                        </span>
                        {role.isSystem && (
                          <span className="chip text-[10px]">
                            <Lock className="h-2.5 w-2.5" />
                            System
                          </span>
                        )}
                        {role.isDefault && (
                          <span className="chip chip-neon text-[10px]">
                            <Star className="h-2.5 w-2.5" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground truncate">
                        {role.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] text-muted-foreground">
                      {role.permissions.length} permissions
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-6 pb-5 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Slug: <span className="font-mono">{role.slug}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        {canEdit && !(role.isSystem && role.slug === "admin") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(role);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-border hover:bg-secondary transition-colors btn-press"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                        {canDelete && !role.isSystem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(role);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors btn-press dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Permission grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {PERMISSION_GROUPS.map((group) => {
                        const modulePerms = group.permissions.filter((p) =>
                          role.permissions.includes(p.key)
                        );
                        if (modulePerms.length === 0) return null;

                        return (
                          <div
                            key={group.module}
                            className="p-2 bg-secondary/50"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                              {group.label}
                            </p>
                            <div className="space-y-0.5">
                              {modulePerms.map((p) => (
                                <div
                                  key={p.key}
                                  className="flex items-center gap-1"
                                >
                                  <Check className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                                  <span className="text-[11px]">
                                    {p.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Non-granted permissions */}
                    {(() => {
                      const denied = PERMISSION_GROUPS.flatMap((g) =>
                        g.permissions.filter(
                          (p) => !role.permissions.includes(p.key)
                        )
                      );
                      if (denied.length === 0) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                            Not Granted
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {denied.map((p) => (
                              <span
                                key={p.key}
                                className="text-[10px] px-2 py-0.5 bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400"
                              >
                                {p.key}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
