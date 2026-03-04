"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  Package,
  Warehouse,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  Search,
  Loader2,
} from "lucide-react";

const DELIVERY_STEPS = [
  { key: "assigned", label: "Assigned" },
  { key: "picked_up", label: "Picked Up" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
] as const;

interface TrackingData {
  _id: string;
  orderNumber: string;
  status: string;
  deliveryStatus: string;
  items: { name: string; sku?: string; quantity: number; unit?: string }[];
  warehouse: { name: string; code: string; city: string } | null;
  deliveryPartner: { name: string; vehicle: string | null } | null;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
}

export default function TrackOrderPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(`/api/orders/track/${orderNumber}`);
      setData(res.data);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Order not found");
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // SSE live connection
  useEffect(() => {
    if (!data?._id) return;

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/orders/${data._id}/stream`);
      es.onopen = () => setLiveConnected(true);
      es.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  status: update.status ?? prev.status,
                  deliveryStatus: update.deliveryStatus ?? prev.deliveryStatus,
                }
              : prev
          );
        } catch {
          // ignore parse errors
        }
      };
      es.onerror = () => setLiveConnected(false);
    } catch {
      // SSE not supported
    }

    return () => {
      es?.close();
      setLiveConnected(false);
    };
  }, [data?._id]);

  const currentStepIdx = data
    ? DELIVERY_STEPS.findIndex((s) => s.key === data.deliveryStatus)
    : -1;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 animate-fade-in">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-[13px] text-muted-foreground">Looking up order...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 animate-fade-in">
        <div className="h-14 w-14 flex items-center justify-center bg-secondary">
          <Search className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium">{error || "Order not found"}</p>
        <p className="text-[12px] text-muted-foreground">
          Check the order number and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight font-mono">
            {data.orderNumber}
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Placed on {new Date(data.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {liveConnected && (
            <span className="flex items-center gap-1.5 text-[11px] text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
          <span className="chip">{data.status}</span>
        </div>
      </div>

      {/* Delivery Progress */}
      {data.deliveryStatus !== "unassigned" && (
        <div className="surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-4">
            Delivery Progress
          </p>

          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
            {/* Progress line */}
            <div
              className="absolute top-4 left-0 h-0.5 bg-foreground transition-all duration-700"
              style={{
                width: `${currentStepIdx >= 0 ? (currentStepIdx / (DELIVERY_STEPS.length - 1)) * 100 : 0}%`,
              }}
            />

            {DELIVERY_STEPS.map((step, i) => {
              const done = i <= currentStepIdx;
              const active = i === currentStepIdx;
              return (
                <div key={step.key} className="flex flex-col items-center z-10">
                  <div
                    className={`h-8 w-8 flex items-center justify-center transition-all duration-500 ${
                      done
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground border border-border"
                    } ${active ? "ring-2 ring-foreground/20 ring-offset-2" : ""}`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Clock className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </div>
                  <span
                    className={`text-[11px] mt-2 ${
                      active ? "font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {data.deliveryStatus === "failed" && (
            <div className="flex items-center gap-2 mt-4 text-red-600 bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-[12px]">Delivery attempt failed. Our team will contact you.</p>
            </div>
          )}

          {data.deliveryStatus === "delivered" && data.actualDelivery && (
            <p className="text-[12px] text-green-600 mt-3">
              Delivered on {new Date(data.actualDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}

      {data.deliveryStatus === "unassigned" && (
        <div className="surface p-5 flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-400">
          <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-yellow-700 dark:text-yellow-300">
              Awaiting Assignment
            </p>
            <p className="text-[12px] text-yellow-600 dark:text-yellow-400">
              A delivery partner will be assigned shortly.
            </p>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Warehouse */}
        {data.warehouse && (
          <div className="surface p-4 flex items-start gap-3">
            <Warehouse className="h-5 w-5 text-foreground/60 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1">
                Fulfilled From
              </p>
              <p className="text-[13px] font-semibold">
                {data.warehouse.name}{" "}
                <span className="font-mono text-[11px] text-muted-foreground">
                  ({data.warehouse.code})
                </span>
              </p>
              <p className="text-[12px] text-muted-foreground">{data.warehouse.city}</p>
            </div>
          </div>
        )}

        {/* Delivery Partner */}
        {data.deliveryPartner && (
          <div className="surface p-4 flex items-start gap-3">
            <Truck className="h-5 w-5 text-foreground/60 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1">
                Delivery Partner
              </p>
              <p className="text-[13px] font-semibold">{data.deliveryPartner.name}</p>
              {data.deliveryPartner.vehicle && (
                <p className="text-[12px] text-muted-foreground font-mono">
                  {data.deliveryPartner.vehicle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Estimated Delivery */}
        {data.estimatedDelivery && (
          <div className="surface p-4 flex items-start gap-3">
            <MapPin className="h-5 w-5 text-foreground/60 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1">
                Estimated Delivery
              </p>
              <p className="text-[13px] font-semibold">
                {new Date(data.estimatedDelivery).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Items
        </p>
        <div className="space-y-2">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-foreground/40" strokeWidth={1.5} />
                <span className="text-[13px] font-medium">{item.name}</span>
                {item.sku && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {item.sku}
                  </span>
                )}
              </div>
              <span className="text-[13px] font-medium tabular-nums">
                {item.quantity} {item.unit ?? ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
