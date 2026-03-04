"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Truck,
  Mail,
  Phone,
  MapPin,
  Trash2,
  ChevronRight,
  Zap,
  Copy,
  CheckCheck,
  KeyRound,
  X,
  Warehouse,
} from "lucide-react";

interface GoDown {
  _id: string;
  name: string;
  code: string;
  city: string;
}

interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  assignedWarehouse?: GoDown | null;
}

const inputCls =
  "w-full px-3 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";
const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [godowns, setGodowns] = useState<GoDown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    loginEmail: string;
    password: string;
    name: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
    lat: "",
    lng: "",
    assignedWarehouse: "",
  });

  const handleGeocodeAddress = async () => {
    const addr = form.address.trim();
    if (!addr) {
      toast.warning("Please enter a base address first");
      return;
    }
    setGeocodeLoading(true);
    try {
      const q = form.pincode ? `${addr}, ${form.pincode}` : addr;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setForm((prev) => ({
          ...prev,
          lat: parseFloat(data[0].lat).toFixed(6),
          lng: parseFloat(data[0].lon).toFixed(6),
        }));
        toast.success("Coordinates found from address!");
      } else {
        toast.warning("Address not found — try a more specific address");
      }
    } catch {
      toast.error("Geocoding failed — enter coordinates manually");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const suppRes = await axios.get("/api/suppliers");
      setSuppliers(suppRes.data);
    } catch (err: any) {
      console.error("suppliers fetch:", err?.response?.data);
      toast.error(err?.response?.data?.error ?? "Failed to load delivery partners");
    } finally {
      setLoading(false);
    }

    // Godowns + online status are non-critical — load independently
    try {
      const whRes = await axios.get("/api/warehouses");
      setGodowns(
        (whRes.data ?? []).map((w: any) => ({
          _id: w._id,
          name: w.name,
          code: w.code,
          city: w.city,
        }))
      );
    } catch {}

    try {
      const statusRes = await axios.get("/api/partners/status");
      const map: Record<string, boolean> = {};
      if (statusRes.data?.statuses) {
        for (const s of statusRes.data.statuses) {
          map[s.partnerId] = s.online;
        }
      }
      setOnlineMap(map);
    } catch {}
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.warning("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        pincode: form.pincode,
      };
      if (form.lat && form.lng) {
        payload.coordinates = { lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
      }
      if (form.assignedWarehouse) {
        payload.assignedWarehouse = form.assignedWarehouse;
      }

      const res = await axios.post("/api/suppliers", payload);
      const { credentials } = res.data as {
        credentials: { loginEmail: string; password: string };
      };
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", address: "", pincode: "", lat: "", lng: "", assignedWarehouse: "" });
      fetchSuppliers();
      // Show credentials modal — password is only available right now
      setCreatedCredentials({
        loginEmail: credentials.loginEmail,
        password: credentials.password,
        name: form.name.trim(),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to add delivery partner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from delivery partners?`)) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/suppliers?id=${id}`);
      toast.success(`${name} removed`);
      setSuppliers((prev) => prev.filter((s) => s._id !== id));
    } catch {
      toast.error("Failed to remove delivery partner");
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async (text: string, field: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Credentials Modal ─────────────────────────────────────────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] border border-border w-full max-w-md mx-4 p-6 space-y-5 shadow-2xl animate-slide-down">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950">
                  <KeyRound className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold tracking-tight">Login Credentials Created</p>
                  <p className="text-[12px] text-muted-foreground">For <span className="font-medium text-foreground">{createdCredentials.name}</span></p>
                </div>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">
                ⚠ Save this password now — it will not be shown again.
              </p>
            </div>

            {/* Login ID */}
            <div className="space-y-1.5">
              <label className={labelCls}>Login ID (Email)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 bg-secondary text-[13px] font-mono border border-border select-all">
                  {createdCredentials.loginEmail}
                </code>
                <button
                  onClick={() => copyToClipboard(createdCredentials.loginEmail, "email")}
                  className="h-10 w-10 flex items-center justify-center border border-border hover:bg-secondary transition-colors shrink-0"
                  title="Copy login ID"
                >
                  {copiedField === "email" ? (
                    <CheckCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className={labelCls}>Password</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 bg-secondary text-[13px] font-mono border border-border tracking-widest select-all">
                  {createdCredentials.password}
                </code>
                <button
                  onClick={() => copyToClipboard(createdCredentials.password, "password")}
                  className="h-10 w-10 flex items-center justify-center border border-border hover:bg-secondary transition-colors shrink-0"
                  title="Copy password"
                >
                  {copiedField === "password" ? (
                    <CheckCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Copy all button */}
            <button
              onClick={() => {
                copyToClipboard(
                  `Login ID: ${createdCredentials.loginEmail}\nPassword: ${createdCredentials.password}`,
                  "password"
                );
                toast.success("Credentials copied to clipboard!");
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              Copy Both to Clipboard
            </button>

            <button
              onClick={() => setCreatedCredentials(null)}
              className="w-full px-4 py-2.5 border border-border text-[13px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              I&apos;ve saved the credentials — Close
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Delivery Partners
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {suppliers.length} delivery partner{suppliers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add Partner
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="surface p-6 space-y-5 animate-slide-down">
          <h2 className="text-[13px] font-semibold tracking-tight">
            New Delivery Partner
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Partner / agent name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="partner@email.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Assigned GoDown</label>
              <select
                value={form.assignedWarehouse}
                onChange={(e) => setForm({ ...form, assignedWarehouse: e.target.value })}
                className={inputCls}
              >
                <option value="">No GoDown assigned</option>
                {godowns.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name} ({g.code}) — {g.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Base Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Warehouse / garage address" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pincode</label>
              <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="110001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Latitude</label>
              <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="28.6139" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="77.2090" className={inputCls} />
            </div>
          </div>

          {/* Get coordinates from address */}
          <button
            type="button"
            onClick={handleGeocodeAddress}
            disabled={geocodeLoading || !form.address.trim()}
            className="flex items-center gap-2 px-4 py-2 border border-border bg-secondary/50 text-[13px] font-medium hover:bg-secondary transition-colors btn-press disabled:opacity-50 w-fit"
          >
            {geocodeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {geocodeLoading ? "Finding coordinates…" : "Auto-fill Lat/Lng from Address"}
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-[13px] font-medium disabled:opacity-50 transition-colors btn-press"
            >
              {submitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Add Partner
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 border border-border text-[13px] font-medium text-muted-foreground hover:bg-secondary transition-colors btn-press"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface p-6 space-y-4">
              <div className="flex gap-3">
                <div className="skeleton h-10 w-10 rounded-sm" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 w-24 rounded-sm" />
                  <div className="skeleton h-3 w-32 rounded-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded-sm" />
                <div className="skeleton h-3 w-2/3 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-4">
          <div className="h-12 w-12 flex items-center justify-center bg-secondary">
            <Truck
              className="h-5 w-5 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-[13px] text-muted-foreground">
            No delivery partners added yet
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-[12px] font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            Add your first delivery partner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {suppliers.map((s) => (
            <Link
              key={s._id}
              href={`/suppliers/${s._id}`}
              className="surface p-6 space-y-4 hover-lift group relative block cursor-pointer"
            >
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(s._id, s.name);
                }}
                disabled={deletingId === s._id}
                className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors opacity-0 group-hover:opacity-100 z-10"
                title="Remove delivery partner"
              >
                {deletingId === s._id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
              </button>

              {/* Header */}
              <div className="flex items-start gap-3 pr-8">
                <div className="h-10 w-10 flex items-center justify-center bg-secondary shrink-0">
                  <Truck
                    className="h-[18px] w-[18px] text-foreground/60"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold tracking-tight truncate">
                      {s.name}
                    </h3>
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        onlineMap[s._id]
                          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                          : "bg-gray-300"
                      }`}
                      title={onlineMap[s._id] ? "Online" : "Offline"}
                    />
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0 mt-1" strokeWidth={1.5} />
              </div>

              {/* Details */}
              <div className="space-y-2 pl-0.5">
                {s.assignedWarehouse && (
                  <div className="flex items-center gap-2 text-[12px] text-foreground font-medium">
                    <Warehouse className="h-3 w-3 text-neon shrink-0" strokeWidth={1.5} />
                    {s.assignedWarehouse.name}
                    <span className="text-[10px] font-mono text-muted-foreground">{s.assignedWarehouse.code}</span>
                  </div>
                )}
                {!s.assignedWarehouse && (
                  <div className="flex items-center gap-2 text-[12px] text-amber-500">
                    <Warehouse className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    No GoDown assigned
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Mail className="h-3 w-3" strokeWidth={1.5} />
                    {s.email}
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Phone className="h-3 w-3" strokeWidth={1.5} />
                    {s.phone}
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground/70 mt-1">
                    <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span>{s.address}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
