"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Truck } from "lucide-react";

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (trimmed) {
      router.push(`/track/${trimmed}`);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 flex items-center justify-center bg-black text-white">
            <Truck className="h-7 w-7" strokeWidth={1.5} />
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Track Your Order
          </h1>
          <p className="text-[14px] text-gray-500 mt-2">
            Enter your order number to see real-time delivery status
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleTrack} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. ORD-20260115-A1B2C"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 text-[14px] placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!orderNumber.trim()}
            className="px-6 py-3 bg-black text-white text-[14px] font-medium hover:bg-gray-900 disabled:opacity-30 transition-colors"
          >
            Track
          </button>
        </form>

        {/* Steps */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center gap-8 text-[12px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
              Assigned
            </div>
            <span>&rarr;</span>
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" strokeWidth={1.5} />
              In Transit
            </div>
            <span>&rarr;</span>
            <div className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
              Delivered
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
