"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  Truck,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Plus,
  Loader2,
  Package,
  CheckCircle2,
  XCircle,
  CircleDot,
  Trash2,
  Warehouse,
  Link2,
} from "lucide-react";

// ── Types ──
interface GoDown {
  _id: string;
  name: string;
  code: string;
  city: string;
}

interface Vehicle {
  _id?: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity?: number;
  isAvailable: boolean;
}

interface Partner {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vehicles: Vehicle[];
  assignedWarehouse?: GoDown | null;
  createdAt: string;
}

interface OrderItem {
  product: { name: string; sku: string } | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Delivery {
  _id: string;
  orderNumber: string;
  type: string;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryStatus: string;
  deliveryVehicle?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdBy?: { name: string } | null;
  createdAt: string;
}

const DELIVERY_STEPS = [
  { key: "assigned", label: "Assigned", icon: CircleDot },
  { key: "picked_up", label: "Picked Up", icon: Package },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const statusColors: Record<string, string> = {
  unassigned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  assigned: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  picked_up: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
  in_transit: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  delivered: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  failed: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const vehicleTypes = ["Truck", "Van", "Tempo", "Bike", "Auto", "Mini Truck"];

const inputCls =
  "w-full px-3 py-2 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";
const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1";

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [updatingDelivery, setUpdatingDelivery] = useState<string | null>(null);
  const [godowns, setGodowns] = useState<GoDown[]>([]);
  const [selectedGodown, setSelectedGodown] = useState("");
  const [savingGodown, setSavingGodown] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: "",
    vehicleType: "Truck",
    capacity: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [detailRes, statusRes, godownsRes] = await Promise.all([
        axios.get(`/api/suppliers/${id}`),
        axios.get(`/api/partners/status?id=${id}`),
        axios.get("/api/warehouses"),
      ]);
      const p = detailRes.data.partner;
      setPartner(p);
      setDeliveries(detailRes.data.deliveries);
      setIsOnline(statusRes.data.online ?? false);
      const gds = godownsRes.data?.warehouses ?? godownsRes.data ?? [];
      setGodowns(gds);
      // Pre-select current assignment
      if (p?.assignedWarehouse?._id) {
        setSelectedGodown(p.assignedWarehouse._id);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        toast.error("Delivery partner not found");
        router.replace("/suppliers");
        return;
      }
      toast.error("Failed to load partner details");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── GoDown assignment ──
  const handleAssignGodown = async () => {
    setSavingGodown(true);
    try {
      await axios.patch(`/api/suppliers/${id}`, {
        assignedWarehouse: selectedGodown || null,
      });
      toast.success(selectedGodown ? "GoDown assigned successfully" : "GoDown unassigned");
      fetchData();
    } catch {
      toast.error("Failed to assign GoDown");
    } finally {
      setSavingGodown(false);
    }
  };

  // ── Online/Offline toggle ──
  const toggleOnline = async () => {
    setTogglingOnline(true);
    const next = !isOnline;
    setIsOnline(next); // optimistic
    try {
      await axios.post("/api/partners/status", { partnerId: id, online: next });
      toast.success(next ? "Partner is now Online" : "Partner is now Offline");
    } catch {
      setIsOnline(!next); // revert
      toast.error("Failed to update status");
    } finally {
      setTogglingOnline(false);
    }
  };

  // ── Vehicle management ──
  const addVehicle = async () => {
    if (!vehicleForm.vehicleNumber.trim()) {
      toast.warning("Vehicle number is required");
      return;
    }
    setSavingVehicle(true);
    try {
      const newVehicle: Vehicle = {
        vehicleNumber: vehicleForm.vehicleNumber,
        vehicleType: vehicleForm.vehicleType,
        capacity: vehicleForm.capacity ? Number(vehicleForm.capacity) : undefined,
        isAvailable: true,
      };
      const updated = [
        ...(partner?.vehicles ?? []),
        newVehicle,
      ];
      await axios.patch(`/api/suppliers/${id}`, { vehicles: updated });
      toast.success("Vehicle added");
      setVehicleForm({ vehicleNumber: "", vehicleType: "Truck", capacity: "" });
      setShowVehicleForm(false);
      fetchData();
    } catch {
      toast.error("Failed to add vehicle");
    } finally {
      setSavingVehicle(false);
    }
  };

  const removeVehicle = async (idx: number) => {
    if (!partner) return;
    const updated = (partner.vehicles ?? []).filter((_, i) => i !== idx);
    try {
      await axios.patch(`/api/suppliers/${id}`, { vehicles: updated });
      toast.success("Vehicle removed");
      fetchData();
    } catch {
      toast.error("Failed to remove vehicle");
    }
  };

  // ── Delivery status update ──
  const updateDeliveryStatus = async (orderId: string, newStatus: string) => {
    setUpdatingDelivery(orderId);
    try {
      await axios.patch(`/api/orders/${orderId}/delivery`, {
        deliveryStatus: newStatus,
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      fetchData();
    } catch {
      toast.error("Failed to update delivery status");
    } finally {
      setUpdatingDelivery(null);
    }
  };

  // ── Helpers ──
  const stepIndex = (status: string) =>
    DELIVERY_STEPS.findIndex((s) => s.key === status);

  const activeDeliveries = deliveries.filter(
    (d) => d.deliveryStatus !== "delivered" && d.deliveryStatus !== "failed"
  );
  const completedDeliveries = deliveries.filter(
    (d) => d.deliveryStatus === "delivered" || d.deliveryStatus === "failed"
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="skeleton h-5 w-5 rounded-sm" />
          <div className="skeleton h-6 w-48 rounded-sm" />
        </div>
        <div className="surface p-6 space-y-4">
          <div className="skeleton h-5 w-32 rounded-sm" />
          <div className="skeleton h-4 w-64 rounded-sm" />
          <div className="skeleton h-4 w-48 rounded-sm" />
        </div>
        <div className="surface p-6 space-y-4">
          <div className="skeleton h-5 w-24 rounded-sm" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-52 gap-4 animate-fade-in">
        <Truck className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-[13px] text-muted-foreground">
          Delivery partner not found
        </p>
        <button
          onClick={() => router.push("/suppliers")}
          className="text-[12px] font-medium underline underline-offset-4"
        >
          Back to partners
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push("/suppliers")}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Delivery Partners
        </button>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 flex items-center justify-center bg-secondary shrink-0">
            <Truck className="h-5 w-5 text-foreground/60" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {partner.name}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              {(partner.vehicles ?? []).length} vehicle{(partner.vehicles ?? []).length !== 1 ? "s" : ""} · {deliveries.length} delivery{deliveries.length !== 1 ? " orders" : " order"}
            </p>
          </div>
          {/* Online/Offline Toggle */}
          <button
            onClick={toggleOnline}
            disabled={togglingOnline}
            className={`ml-auto flex items-center gap-2 px-4 py-2 text-[12px] font-semibold border transition-colors btn-press ${
              isOnline
                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isOnline ? "Online" : "Offline"}
          </button>
        </div>
      </div>

      {/* Partner Info Card */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Partner Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {partner.email && (
            <div className="flex items-center gap-2 text-[13px]">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span>{partner.email}</span>
            </div>
          )}
          {partner.phone && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span>{partner.phone}</span>
            </div>
          )}
          {partner.address && (
            <div className="flex items-center gap-2 text-[13px] sm:col-span-2 lg:col-span-3">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span>{partner.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── GoDown Assignment ── */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Assigned GoDown
        </p>
        {partner.assignedWarehouse ? (
          <div className="flex items-center gap-3 mb-4 p-3 border border-border bg-secondary/30">
            <div className="h-8 w-8 flex items-center justify-center bg-secondary shrink-0">
              <Warehouse className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[13px] font-semibold">{partner.assignedWarehouse.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {partner.assignedWarehouse.code} · {partner.assignedWarehouse.city}
              </p>
            </div>
            <span className="ml-auto text-[10px] bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400 px-2 py-0.5 font-medium">Assigned</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 text-[12px] text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>No GoDown assigned yet</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <select
            value={selectedGodown}
            onChange={(e) => setSelectedGodown(e.target.value)}
            className="flex-1 px-3 py-2 border border-border bg-white text-[13px] focus:outline-none focus:border-foreground/20 transition-colors"
          >
            <option value="">— No GoDown —</option>
            {godowns.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name} ({g.code}, {g.city})
              </option>
            ))}
          </select>
          <button
            onClick={handleAssignGodown}
            disabled={savingGodown || selectedGodown === (partner.assignedWarehouse?._id ?? "")}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[12px] font-medium disabled:opacity-40 btn-press whitespace-nowrap"
          >
            {savingGodown && <Loader2 className="h-3 w-3 animate-spin" />}
            {selectedGodown ? "Assign GoDown" : "Remove Assignment"}
          </button>
        </div>
      </div>

      {/* ── Vehicles Section ── */}
      <div className="surface p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Fleet / Vehicles ({(partner.vehicles ?? []).length})
          </p>
          <button
            onClick={() => setShowVehicleForm(!showVehicleForm)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Vehicle
          </button>
        </div>

        {/* Add vehicle form */}
        {showVehicleForm && (
          <div className="border border-border p-4 mb-4 space-y-3 animate-slide-down">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Vehicle Number *</label>
                <input
                  value={vehicleForm.vehicleNumber}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="MH 02 AB 1234"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select
                  value={vehicleForm.vehicleType}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })
                  }
                  className={inputCls}
                >
                  {vehicleTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Capacity (kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.capacity}
                    onChange={(e) =>
                      setVehicleForm({ ...vehicleForm, capacity: e.target.value })
                    }
                    placeholder="500"
                    className={`${inputCls} pr-10`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-medium">kg</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addVehicle}
                disabled={savingVehicle}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[12px] font-medium disabled:opacity-50 btn-press"
              >
                {savingVehicle && <Loader2 className="h-3 w-3 animate-spin" />}
                Save
              </button>
              <button
                onClick={() => setShowVehicleForm(false)}
                className="px-4 py-2 border border-border text-[12px] font-medium text-muted-foreground hover:bg-secondary btn-press"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Vehicle list */}
        {(partner.vehicles ?? []).length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2">
            <Truck className="h-6 w-6 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-[12px] text-muted-foreground">No vehicles added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(partner.vehicles ?? []).map((v, idx) => (
              <div
                key={v._id ?? idx}
                className="border border-border p-3 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 flex items-center justify-center bg-secondary shrink-0">
                    <Truck className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold font-mono">
                      {v.vehicleNumber}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.vehicleType}
                      {v.capacity ? ` · ${v.capacity} kg` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 font-medium ${
                      v.isAvailable
                        ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                        : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
                    }`}
                  >
                    {v.isAvailable ? "Available" : "On Trip"}
                  </span>
                  <button
                    onClick={() => removeVehicle(idx)}
                    className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Deliveries ── */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-4">
          Active Deliveries ({activeDeliveries.length})
        </p>

        {activeDeliveries.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <Package className="h-6 w-6 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-[12px] text-muted-foreground">
              No active deliveries assigned
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDeliveries.map((d) => {
              const currentStep = stepIndex(d.deliveryStatus);
              return (
                <div key={d._id} className="border border-border p-4 space-y-4">
                  {/* Order header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold font-mono">
                          {d.orderNumber}
                        </p>
                        <span
                          className={`text-[10px] px-2 py-0.5 font-medium ${
                            statusColors[d.deliveryStatus] ?? statusColors.unassigned
                          }`}
                        >
                          {d.deliveryStatus.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {d.items.length} item{d.items.length !== 1 ? "s" : ""} · ₹{d.totalAmount.toLocaleString()}
                        {d.deliveryVehicle && ` · ${d.deliveryVehicle}`}
                      </p>
                    </div>
                    {d.estimatedDelivery && (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase">ETA</p>
                        <p className="text-[12px] font-medium">
                          {new Date(d.estimatedDelivery).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Delivery address */}
                  {d.deliveryAddress && (
                    <div className="flex items-start gap-2 text-[12px] text-muted-foreground bg-secondary/50 p-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{d.deliveryAddress}</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-1">
                    {d.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground">
                          {item.product?.name ?? "Unknown"}{" "}
                          <span className="font-mono text-[11px]">
                            ({item.product?.sku ?? "—"})
                          </span>
                        </span>
                        <span className="font-medium">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress tracker */}
                  <div className="pt-2">
                    <div className="flex items-center gap-0">
                      {DELIVERY_STEPS.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isCompleted = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div
                                className={`h-7 w-7 flex items-center justify-center rounded-full transition-colors ${
                                  isCompleted
                                    ? "bg-foreground text-background"
                                    : "bg-secondary text-muted-foreground"
                                } ${isCurrent ? "ring-2 ring-foreground/20" : ""}`}
                              >
                                <StepIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </div>
                              <span
                                className={`text-[10px] font-medium ${
                                  isCompleted ? "text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                            {idx < DELIVERY_STEPS.length - 1 && (
                              <div
                                className={`h-[2px] flex-1 -mt-4 ${
                                  idx < currentStep ? "bg-foreground" : "bg-border"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {d.deliveryStatus === "assigned" && (
                      <button
                        onClick={() => updateDeliveryStatus(d._id, "picked_up")}
                        disabled={updatingDelivery === d._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-foreground text-background disabled:opacity-50 btn-press"
                      >
                        {updatingDelivery === d._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Package className="h-3 w-3" />
                        )}
                        Mark Picked Up
                      </button>
                    )}
                    {d.deliveryStatus === "picked_up" && (
                      <button
                        onClick={() => updateDeliveryStatus(d._id, "in_transit")}
                        disabled={updatingDelivery === d._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-foreground text-background disabled:opacity-50 btn-press"
                      >
                        {updatingDelivery === d._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Truck className="h-3 w-3" />
                        )}
                        Mark In Transit
                      </button>
                    )}
                    {d.deliveryStatus === "in_transit" && (
                      <>
                        <button
                          onClick={() => updateDeliveryStatus(d._id, "delivered")}
                          disabled={updatingDelivery === d._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-green-600 text-white disabled:opacity-50 btn-press"
                        >
                          {updatingDelivery === d._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Mark Delivered
                        </button>
                        <button
                          onClick={() => updateDeliveryStatus(d._id, "failed")}
                          disabled={updatingDelivery === d._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-red-200 text-red-600 disabled:opacity-50 btn-press dark:border-red-900 dark:text-red-400"
                        >
                          <XCircle className="h-3 w-3" />
                          Failed
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Completed / Past Deliveries ── */}
      {completedDeliveries.length > 0 && (
        <div className="surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-4">
            Past Deliveries ({completedDeliveries.length})
          </p>
          <div className="space-y-2">
            {completedDeliveries.map((d) => (
              <div
                key={d._id}
                className="flex items-center justify-between border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-7 w-7 flex items-center justify-center ${
                      d.deliveryStatus === "delivered"
                        ? "bg-green-50 dark:bg-green-950"
                        : "bg-red-50 dark:bg-red-950"
                    }`}
                  >
                    {d.deliveryStatus === "delivered" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium font-mono">
                      {d.orderNumber}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.items.length} items · ₹{d.totalAmount.toLocaleString()}
                      {d.deliveryAddress ? ` · ${d.deliveryAddress}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] px-2 py-0.5 font-medium ${
                      statusColors[d.deliveryStatus] ?? ""
                    }`}
                  >
                    {d.deliveryStatus === "delivered" ? "DELIVERED" : "FAILED"}
                  </span>
                  {d.actualDelivery && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(d.actualDelivery).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
