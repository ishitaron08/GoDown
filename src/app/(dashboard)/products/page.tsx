"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  ChevronDown,
} from "lucide-react";
import { formatCurrency, formatDate, getStockStatus } from "@/lib/utils";
import Link from "next/link";

interface GoDownStock {
  _id: string;
  name: string;
  code: string;
  city: string;
  quantity: number;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  quantity: number;
  totalStock: number;
  godownStock: GoDownStock[];
  minStockLevel: number;
  unit: string;
  category: { name: string };
  isActive: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/products", {
        params: { page, limit: 20, search },
      });
      setProducts(res.data.products);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Archive this product?")) return;
    try {
      await axios.delete(`/api/products/${id}`);
      toast.success("Product archived");
      fetchProducts();
    } catch {
      toast.error("Failed to archive product");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Products</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {total} products total
          </p>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="Search by name, SKU, or tag..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-6">
                <div className="skeleton h-4 w-32 rounded-sm" />
                <div className="skeleton h-4 w-20 rounded-sm" />
                <div className="skeleton h-4 w-16 rounded-sm" />
                <div className="skeleton h-4 w-12 rounded-sm" />
                <div className="skeleton h-4 w-16 rounded-sm" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 gap-4">
            <div className="h-12 w-12 flex items-center justify-center bg-secondary">
              <Package
                className="h-5 w-5 text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-[13px] text-muted-foreground">
              No products found
            </p>
            <Link
              href="/products/new"
              className="text-[12px] font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              Create your first product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    SKU
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Total Stock
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    GoDowns
                  </th>
                  <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Price
                  </th>
                  <th className="px-6 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const status = getStockStatus(p.totalStock, p.minStockLevel);
                  const isExpanded = expandedId === p._id;
                  return (
                    <tr
                      key={p._id}
                      className="border-t border-black/[0.03] hover:bg-secondary/50 transition-colors group cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : p._id)}
                    >
                      <td className="px-6 py-3.5 font-medium">{p.name}</td>
                      <td className="px-6 py-3.5 text-muted-foreground font-mono text-[11px]">
                        {p.sku}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {p.category?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3.5 tabular-nums">
                        <span className={`font-semibold ${
                          status === "out-of-stock" ? "text-red-500" :
                          status === "low-stock" ? "text-amber-500" : ""
                        }`}>
                          {p.totalStock}
                        </span>
                        <span className="text-muted-foreground text-[11px] ml-0.5">
                          {p.unit}
                        </span>
                        {status !== "in-stock" && (
                          <span className={`ml-2 chip text-[10px] ${
                            status === "out-of-stock" ? "chip-neon" : "chip-danger"
                          }`}>
                            {status.replace(/-/g, " ")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {p.godownStock.length > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : p._id);
                            }}
                            className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Warehouse className="h-3 w-3" strokeWidth={1.5} />
                            {p.godownStock.length} godown{p.godownStock.length !== 1 ? "s" : ""}
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
                          </button>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/50">—</span>
                        )}
                        {isExpanded && p.godownStock.length > 0 && (
                          <div className="mt-2 space-y-1 animate-slide-down">
                            {p.godownStock.map((g) => (
                              <div key={g._id} className="flex items-center justify-between text-[11px] px-2 py-1 bg-secondary/70 border border-border">
                                <span className="font-medium">{g.name} <span className="font-mono text-muted-foreground">({g.code})</span></span>
                                <span className="tabular-nums font-medium">{g.quantity} {p.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium tabular-nums">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/products/${p._id}/edit`}
                            className="h-7 w-7 flex items-center justify-center hover:bg-secondary transition-colors"
                          >
                            <Edit
                              className="h-3.5 w-3.5 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                          </Link>
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="h-7 w-7 flex items-center justify-center hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2
                              className="h-3.5 w-3.5 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px]">
          <p className="text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 flex items-center justify-center border border-border hover:bg-secondary disabled:opacity-30 transition-colors btn-press"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 flex items-center justify-center border border-border hover:bg-secondary disabled:opacity-30 transition-colors btn-press"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
