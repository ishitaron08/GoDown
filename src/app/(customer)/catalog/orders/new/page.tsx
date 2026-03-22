"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Loader2, ArrowLeft, ShoppingCart, Package, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  unit: string;
  totalStock: number;
  category?: { name: string };
  images?: { url: string }[];
}

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPincode, setCustomerPincode] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);

  // Fetch product details
  useEffect(() => {
    if (!productId) {
      toast.error("No product selected");
      router.push("/catalog");
      return;
    }

    axios
      .get(`/api/products/${productId}`)
      .then((res) => {
        setProduct(res.data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load product");
        router.push("/catalog");
      });
  }, [productId, router]);

  const totalPrice = product ? parseInt(quantity) * product.price : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;
    if (!quantity || parseInt(quantity) < 1) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (!customerAddress.trim()) {
      toast.error("Please enter your address");
      return;
    }
    if (!customerPincode.trim()) {
      toast.error("Please enter pincode");
      return;
    }

    setSubmitting(true);

    try {
      await axios.post("/api/orders", {
        type: "outbound",
        items: [
          {
            product: product._id,
            quantity: parseInt(quantity),
            unitPrice: product.price,
            totalPrice: parseInt(quantity) * product.price,
          },
        ],
        totalAmount: parseInt(quantity) * product.price,
        customerName,
        customerPhone,
        customerAddress,
        customerPincode,
      });

      setOrderCreated(true);
      toast.success("Order placed successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-3" strokeWidth={1} />
        <p className="text-[14px] font-medium text-muted-foreground">Product not found</p>
      </div>
    );
  }

  if (orderCreated) {
    return (
      <div className="max-w-md mx-auto py-20 space-y-6 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-600" strokeWidth={2} />
            </div>
          </div>
          <div>
            <h1 className="text-[20px] font-semibold">Order Placed Successfully!</h1>
            <p className="text-[13px] text-muted-foreground mt-2">
              Your order has been submitted for review. The admin will approve it shortly.
            </p>
          </div>
        </div>

        <div className="surface p-4 space-y-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Order Details:</span>
          </div>
          <div className="text-[13px] space-y-2 border-t border-border pt-3">
            <div className="flex justify-between">
              <span>{quantity}x {product.name}</span>
              <span className="font-medium">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-medium text-[14px] border-t border-border pt-2">
              <span>Total:</span>
              <span>₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Link
            href="/catalog/orders"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
          >
            View My Orders
          </Link>
          <Link
            href="/catalog"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-border hover:bg-secondary transition-colors text-[13px] font-medium"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/catalog"
          className="p-1.5 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold">Place Order</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Review product details and confirm delivery address
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Summary */}
        <div className="surface p-4 border-l-4 border-blue-500">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {product.category?.name ?? "Product"}
              </p>
              <h2 className="text-[16px] font-semibold">{product.name}</h2>
              <p className="text-[11px] text-muted-foreground">SKU: {product.sku}</p>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-[20px] font-bold">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  per {product.unit}
                </span>
              </div>
            </div>
            <div className="text-right text-[12px] text-muted-foreground">
              {product.totalStock} available
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="surface p-5 space-y-4">
          <h3 className="text-[13px] font-semibold">Order Details</h3>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
              Quantity ({product.unit})
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={product.totalStock}
              className="w-full px-4 py-2.5 border border-border bg-white text-[13px] focus:outline-none focus:border-foreground/20 transition-colors"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Max available: {product.totalStock} {product.unit}
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-[14px] font-semibold mt-2 pt-2 border-t border-border">
              <span>Total:</span>
              <span>₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="surface p-5 space-y-4">
          <h3 className="text-[13px] font-semibold">Delivery Address</h3>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="10-digit phone number"
              className="w-full px-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
              Address
            </label>
            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Street address, building, area"
              rows={3}
              className="w-full px-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
              Pincode
            </label>
            <input
              type="text"
              value={customerPincode}
              onChange={(e) => setCustomerPincode(e.target.value)}
              placeholder="6-digit pincode"
              className="w-full px-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/catalog"
            className="flex items-center justify-center gap-2 flex-1 py-2.5 border border-border hover:bg-secondary transition-colors text-[13px] font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors btn-press"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                Place Order
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Your order will be pending admin approval before processing
        </p>
      </form>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <NewOrderForm />
    </Suspense>
  );
}
