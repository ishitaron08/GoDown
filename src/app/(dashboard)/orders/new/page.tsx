"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Package,
  Truck,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Zap,
} from "lucide-react";

interface ProductOption {
  _id: string;
  name: string;
  sku: string;
  price: number;
  unit: string;
}

interface CartItem {
  product: ProductOption;
  quantity: number;
}

interface AssignResult {
  warehouse: { _id: string; name: string; code: string; distance: number };
  fallbackWarehouse?: { _id: string; name: string; code: string; distance: number; reason: string };
  deliveryPartner?: { _id: string; name: string; distance: number; vehicle?: { vehicleNumber: string; vehicleType: string; capacity?: number } };
  itemsAvailable: string[];
  itemsRedirected: string[];
  allFulfilled: boolean;
}

const inputCls =
  "w-full px-3 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";
const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5";

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [result, setResult] = useState<AssignResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast.warning("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomer((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        toast.success("Location detected!");
        setGeoLoading(false);
      },
      (err) => {
        toast.warning(err.code === 1 ? "Location access denied — enter manually" : "Could not get location — enter manually");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGeocode = async () => {
    const addr = customer.address.trim();
    if (!addr) {
      toast.warning("Please enter a delivery address first");
      return;
    }
    setGeocodeLoading(true);
    try {
      const q = customer.pincode ? `${addr}, ${customer.pincode}` : addr;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setCustomer((prev) => ({
          ...prev,
          lat: parseFloat(data[0].lat).toFixed(6),
          lng: parseFloat(data[0].lon).toFixed(6),
        }));
        toast.success("Coordinates found from address!");
      } else {
        toast.warning("Address not found — try a more specific address or enter coordinates manually");
      }
    } catch {
      toast.error("Geocoding failed — please enter coordinates manually");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    lat: "",
    lng: "",
  });

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get("/api/products?limit=500");
      const items = res.data.products ?? res.data ?? [];
      setProducts(items.map((p: any) => ({
        _id: p._id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        unit: p.unit,
      })));
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addToCart = (productId: string) => {
    const prod = products.find((p) => p._id === productId);
    if (!prod) return;
    const existing = cart.find((c) => c.product._id === productId);
    if (existing) {
      setCart(cart.map((c) => c.product._id === productId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { product: prod, quantity: 1 }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.product._id === productId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  };

  const totalAmount = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);

  const handleSubmit = async () => {
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      toast.warning("Please fill in customer details (name, phone, address)");
      return;
    }
    if (!customer.lat || !customer.lng) {
      toast.warning("Please enter customer coordinates (latitude & longitude) for auto-routing");
      return;
    }
    if (cart.length === 0) {
      toast.warning("Add at least one item to the order");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await axios.post("/api/orders/auto-assign", {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerPincode: customer.pincode,
        customerCoordinates: {
          lat: parseFloat(customer.lat),
          lng: parseFloat(customer.lng),
        },
        items: cart.map((c) => ({
          product: c.product._id,
          quantity: c.quantity,
          unitPrice: c.product.price,
          totalPrice: c.product.price * c.quantity,
        })),
        totalAmount,
      });
      setResult(res.data.assignment);
      setTrackingNumber(res.data.order?.orderNumber ?? null);
      toast.success("Order placed & auto-assigned!");
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (typeof msg === "string") {
        toast.error(msg);
      } else {
        toast.error("Failed to place order");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-6 w-48 rounded-sm" />
        <div className="skeleton h-64 w-full rounded-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/orders")}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center bg-secondary">
            <Zap className="h-5 w-5 text-foreground/60" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">New Auto-Routed Order</h1>
            <p className="text-[12px] text-muted-foreground">
              System will find the nearest GoDown with stock and assign the closest delivery partner
            </p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Customer Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Customer name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+91 …" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Pincode</label>
            <input value={customer.pincode} onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })} placeholder="110001" className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Delivery Address *</label>
            <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Full delivery address" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Latitude *</label>
            <input type="number" step="any" value={customer.lat} onChange={(e) => setCustomer({ ...customer, lat: e.target.value })} placeholder="28.6139" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Longitude *</label>
            <input type="number" step="any" value={customer.lng} onChange={(e) => setCustomer({ ...customer, lng: e.target.value })} placeholder="77.2090" className={inputCls} />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleGeolocation}
              disabled={geoLoading}
              className="flex items-center gap-2 px-4 py-2.5 border border-border bg-secondary/50 text-[13px] font-medium hover:bg-secondary transition-colors btn-press disabled:opacity-50"
            >
              {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
              {geoLoading ? "Detecting…" : "Use My Location"}
            </button>
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocodeLoading || !customer.address.trim()}
              className="flex items-center gap-2 px-4 py-2.5 border border-border bg-secondary/50 text-[13px] font-medium hover:bg-secondary transition-colors btn-press disabled:opacity-50"
            >
              {geocodeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {geocodeLoading ? "Finding…" : "Get from Address"}
            </button>
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className="surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Select Products
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-4">
          {products.map((p) => {
            const inCart = cart.find((c) => c.product._id === p._id);
            return (
              <button
                key={p._id}
                onClick={() => addToCart(p._id)}
                className={`flex items-center justify-between px-3 py-2 text-left border transition-colors ${
                  inCart ? "border-foreground/20 bg-secondary/50" : "border-border hover:bg-secondary/30"
                }`}
              >
                <div>
                  <p className="text-[13px] font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{p.sku} · ₹{p.price}/{p.unit}</p>
                </div>
                {inCart && (
                  <span className="text-[11px] font-semibold bg-foreground text-background px-2 py-0.5">
                    ×{inCart.quantity}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">Cart</p>
            {cart.map((c) => (
              <div key={c.product._id} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-[13px] font-medium">{c.product.name}</span>
                  <span className="text-[12px] text-muted-foreground ml-2">₹{c.product.price} × {c.quantity} = ₹{(c.product.price * c.quantity).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(c.product._id, -1)} className="h-6 w-6 flex items-center justify-center border border-border hover:bg-secondary">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-[13px] font-mono">{c.quantity}</span>
                  <button onClick={() => updateQty(c.product._id, 1)} className="h-6 w-6 flex items-center justify-center border border-border hover:bg-secondary">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[13px] font-semibold">Total</span>
              <span className="text-[14px] font-bold">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || cart.length === 0}
        className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-[13px] font-semibold disabled:opacity-50 btn-press w-full justify-center"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        Place Order & Auto-Assign
      </button>

      {/* ── Assignment Result ── */}
      {result && (
        <div className="surface p-5 space-y-4 animate-slide-down border-l-4 border-green-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-[14px] font-semibold">Order Auto-Assigned Successfully</h2>
          </div>

          {/* Warehouse */}
          <div className="flex items-start gap-3 bg-secondary/50 p-3">
            <Warehouse className="h-5 w-5 text-foreground/60 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-[13px] font-semibold">{result.warehouse.name} <span className="text-[11px] font-mono text-muted-foreground">({result.warehouse.code})</span></p>
              <p className="text-[12px] text-muted-foreground">{result.warehouse.distance} km from customer</p>
            </div>
          </div>

          {/* Fallback warehouse */}
          {result.fallbackWarehouse && (
            <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950/30 p-3 border border-yellow-200 dark:border-yellow-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-[13px] font-semibold text-yellow-700 dark:text-yellow-300">
                  Some items redirected to {result.fallbackWarehouse.name} ({result.fallbackWarehouse.code})
                </p>
                <p className="text-[12px] text-yellow-600 dark:text-yellow-400">
                  {result.fallbackWarehouse.reason} — {result.fallbackWarehouse.distance} km from customer
                </p>
              </div>
            </div>
          )}

          {/* Delivery Partner */}
          {result.deliveryPartner ? (
            <div className="flex items-start gap-3 bg-secondary/50 p-3">
              <Truck className="h-5 w-5 text-foreground/60 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-[13px] font-semibold">{result.deliveryPartner.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {result.deliveryPartner.distance} km from warehouse
                  {result.deliveryPartner.vehicle && (
                    <> · Vehicle: <span className="font-mono">{result.deliveryPartner.vehicle.vehicleNumber}</span> ({result.deliveryPartner.vehicle.vehicleType})</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950/30 p-3 border border-yellow-200 dark:border-yellow-900">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-[12px] text-yellow-700 dark:text-yellow-300">
                No delivery partner available for auto-assignment. Assign manually from the orders page.
              </p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/orders")}
              className="text-[12px] font-medium underline underline-offset-4 text-foreground hover:text-foreground/80"
            >
              View All Orders →
            </button>
            {trackingNumber && (
              <a
                href={`/track/${trackingNumber}`}
                target="_blank"
                className="text-[12px] font-medium underline underline-offset-4 text-foreground hover:text-foreground/80"
              >
                Track Order →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
