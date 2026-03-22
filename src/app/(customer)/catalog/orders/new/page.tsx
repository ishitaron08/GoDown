"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react";
import {
  Package,
  Minus,
  Plus,
  ShoppingCart,
  ArrowLeft,
  Loader2,
  MapPin,
  User,
  Phone,
  FileText,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

interface ProductImage {
  url: string;
  fileId: string;
}

interface ProductData {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  unit: string;
  quantity: number;
  totalStock: number;
  images: ProductImage[];
  category?: { _id: string; name: string };
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewOrderPageContent />
    </Suspense>
  );
}

function NewOrderPageContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const productId = searchParams.get("product");

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Customer form fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPincode, setCustomerPincode] = useState("");
  const [notes, setNotes] = useState("");

  // Pre-fill name from session
  useEffect(() => {
    if (session?.user?.name) {
      setCustomerName(session.user.name);
    }
  }, [session]);

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/products/${productId}`);
      setProduct(res.data);
    } catch {
      toast.error("Product not found");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const totalAmount = product ? product.price * quantity : 0;
  const maxQty = product ? Math.min(product.totalStock, 100) : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (!customerAddress.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/orders", {
        type: "outbound",
        items: [
          {
            product: product._id,
            quantity,
            unitPrice: product.price,
            totalPrice: totalAmount,
          },
        ],
        totalAmount,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerPincode: customerPincode.trim(),
        notes: notes.trim() || undefined,
      });

      setSuccess(true);
      toast.success("Order placed successfully!");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? typeof err.response.data.error === "string"
            ? err.response.data.error
            : "Invalid order data"
          : "Failed to place order";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Order Placed Successfully!
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2">
            Your order has been submitted and is being processed. You can track
            it from your orders page.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/catalog/orders"
            className="px-5 py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
          >
            View My Orders
          </Link>
          <Link
            href="/catalog"
            className="px-5 py-2.5 border border-border text-[13px] font-medium hover:bg-secondary transition-colors btn-press"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No product found
  if (!product) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <Package className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <h1 className="text-lg font-semibold">Product Not Found</h1>
        <p className="text-[13px] text-muted-foreground">
          The product you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/catalog"
          className="p-2 hover:bg-secondary rounded-md transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Place Order</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Complete your order details below
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Product + Quantity */}
        <div className="lg:col-span-3 space-y-5">
          {/* Product Card */}
          <div className="border border-border bg-white p-5 space-y-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </h2>
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-secondary/50 rounded-md overflow-hidden shrink-0">
                {product.images?.[0]?.url ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] font-semibold">{product.name}</h3>
                <p className="text-[12px] text-muted-foreground">
                  SKU: {product.sku}
                </p>
                {product.category && (
                  <span className="inline-block text-[11px] px-2 py-0.5 bg-secondary text-muted-foreground rounded-full">
                    {product.category.name}
                  </span>
                )}
                <p className="text-[15px] font-semibold mt-1">
                  ₹{product.price.toLocaleString()}{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    per {product.unit}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="border border-border bg-white p-5 space-y-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quantity
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-md">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2.5 hover:bg-secondary transition-colors disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(maxQty, v)));
                  }}
                  className="w-16 text-center text-[14px] font-medium border-x border-border py-2 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                  className="p-2.5 hover:bg-secondary transition-colors disabled:opacity-40"
                  disabled={quantity >= maxQty}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[12px] text-muted-foreground">
                {product.totalStock} {product.unit}(s) available
              </p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="border border-border bg-white p-5 space-y-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2.5 border border-border text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2.5 border border-border text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Delivery Address *
              </label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Full delivery address"
                rows={3}
                className="w-full px-3 py-2.5 border border-border text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors resize-none"
                required
              />
            </div>

            {/* Pincode */}
            <div className="w-48 space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Pincode
              </label>
              <input
                type="text"
                value={customerPincode}
                onChange={(e) => setCustomerPincode(e.target.value)}
                placeholder="e.g. 110001"
                maxLength={6}
                className="w-full px-3 py-2.5 border border-border text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Order Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={2}
                className="w-full px-3 py-2.5 border border-border text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <div className="border border-border bg-white p-5 space-y-5 sticky top-20">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Order Summary
            </h2>

            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span>₹{product.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span>
                  {quantity} {product.unit}(s)
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-[15px] font-semibold">
                <span>Total</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || product.totalStock < 1}
              className="flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {submitting ? "Placing Order..." : "Place Order"}
            </button>

            {product.totalStock < 1 && (
              <p className="text-[12px] text-red-500 text-center">
                This product is currently out of stock
              </p>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              By placing this order, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
