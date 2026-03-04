"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Warehouse,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Zap,
} from "lucide-react";

interface WarehouseItem {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  pincode: string;
  coordinates: { lat: number; lng: number };
  manager: { _id: string; name: string; email: string } | null;
  phone?: string;
  inventoryUpdatedToday: boolean;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

const inputCls =
  "w-full px-3 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";
const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [managers, setManagers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    pincode: "",
    lat: "",
    lng: "",
    manager: "",
    phone: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, usersRes] = await Promise.all([
        axios.get("/api/warehouses"),
        axios.get("/api/users"),
      ]);
      setWarehouses(whRes.data);
      // Filter to managers and admins for the manager dropdown
      const users = usersRes.data.users ?? usersRes.data ?? [];
      setManagers(
        users.filter((u: any) => ["admin", "manager"].includes(u.role))
          .map((u: any) => ({ _id: u._id, name: u.name, email: u.email }))
      );
    } catch {
      toast.error("Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGeocodeAddress = async () => {
    const addr = form.address.trim();
    const city = form.city.trim();
    if (!addr && !city) {
      toast.warning("Please enter an address or city first");
      return;
    }
    setGeocodeLoading(true);
    try {
      const params = new URLSearchParams();
      if (addr) params.set("address", addr);
      if (city) params.set("city", city);
      if (form.pincode) params.set("pincode", form.pincode);

      const res = await fetch(`/api/geocode?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.lat && data.lng) {
        setForm((prev) => ({ ...prev, lat: data.lat, lng: data.lng }));
        toast.success(`Coordinates found${data.query ? ` for "${data.query}"` : ""}!`);
      } else {
        toast.warning("Location not found — enter coordinates manually below");
      }
    } catch {
      toast.error("Geocoding failed — enter coordinates manually");
    } finally {
      setGeocodeLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.address.trim() || !form.city.trim() || !form.pincode.trim() || !form.lat || !form.lng || !form.manager) {
      toast.warning("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/api/warehouses", {
        name: form.name,
        code: form.code.toUpperCase(),
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        coordinates: { lat: parseFloat(form.lat), lng: parseFloat(form.lng) },
        manager: form.manager,
        phone: form.phone,
      });
      toast.success("GoDown added");
      setShowForm(false);
      setForm({ name: "", code: "", address: "", city: "", pincode: "", lat: "", lng: "", manager: "", phone: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to add godown");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate godown "${name}"?`)) return;
    try {
      await axios.delete(`/api/warehouses/${id}`);
      toast.success(`${name} deactivated`);
      setWarehouses((p) => p.filter((w) => w._id !== id));
    } catch {
      toast.error("Failed to deactivate");
    }
  };

  const staleCount = warehouses.filter((w) => !w.inventoryUpdatedToday).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">GoDowns</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {warehouses.length} godown{warehouses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add GoDown
        </button>
      </div>

      {/* Stale inventory warning */}
      {!loading && staleCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" strokeWidth={1.5} />
          <p className="text-[13px] text-yellow-700 dark:text-yellow-300">
            <strong>{staleCount}</strong> godown{staleCount !== 1 ? "s have" : " has"} not updated inventory today. Managers must update stock daily for accurate auto-routing.
          </p>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="surface p-6 space-y-5 animate-slide-down">
          <h2 className="text-[13px] font-semibold tracking-tight">New GoDown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GoDown North Delhi" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Code *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GD-NDEL" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="New Delhi" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pincode *</label>
              <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="110001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Latitude *</label>
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="28.6139" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Longitude *</label>
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="77.2090" className={inputCls} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={geocodeLoading || (!form.address.trim() && !form.city.trim())}
                className="flex items-center gap-2 px-4 py-2.5 border border-border bg-secondary/50 text-[13px] font-medium hover:bg-secondary transition-colors btn-press disabled:opacity-50"
              >
                {geocodeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                {geocodeLoading ? "Finding…" : "Get from Address"}
              </button>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>Address *</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full godown address" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Manager *</label>
              <select value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} className={inputCls}>
                <option value="">Select manager…</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-[13px] font-medium disabled:opacity-50 btn-press">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add GoDown
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-border text-[13px] font-medium text-muted-foreground hover:bg-secondary btn-press">
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
              <div className="skeleton h-5 w-32 rounded-sm" />
              <div className="skeleton h-4 w-48 rounded-sm" />
              <div className="skeleton h-3 w-24 rounded-sm" />
            </div>
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-4">
          <Warehouse className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-[13px] text-muted-foreground">No godowns added yet</p>
          <button onClick={() => setShowForm(true)} className="text-[12px] font-medium underline underline-offset-4">
            Add your first godown
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {warehouses.map((w) => (
            <Link
              key={w._id}
              href={`/warehouses/${w._id}`}
              className="surface p-5 space-y-3 hover-lift group relative block"
            >
              {/* Delete */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(w._id, w.name); }}
                className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-all z-10"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>

              {/* Header */}
              <div className="flex items-start gap-3 pr-8">
                <div className="h-10 w-10 flex items-center justify-center bg-secondary shrink-0">
                  <Warehouse className="h-[18px] w-[18px] text-foreground/60" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold tracking-tight truncate">{w.name}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-secondary text-muted-foreground shrink-0">{w.code}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{w.city} — {w.pincode}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0 mt-1" strokeWidth={1.5} />
              </div>

              {/* Details */}
              <div className="space-y-1.5 pl-0.5">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{w.address}</span>
                </div>
                {w.manager && (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <User className="h-3 w-3" strokeWidth={1.5} />
                    {w.manager.name}
                  </div>
                )}
                {w.phone && (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Phone className="h-3 w-3" strokeWidth={1.5} />
                    {w.phone}
                  </div>
                )}
              </div>

              {/* Inventory status badge */}
              <div className="flex items-center gap-1.5 pt-1">
                {w.inventoryUpdatedToday ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Stock Updated Today
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400">
                    <AlertTriangle className="h-2.5 w-2.5" /> Stock Not Updated
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
