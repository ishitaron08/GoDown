"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Search, Package, Filter, ChevronLeft, ChevronRight, Loader2, X, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

interface ProductImage {
  url: string;
  fileId: string;
}

interface CatalogProduct {
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

interface Category {
  _id: string;
  name: string;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [mainImage, setMainImage] = useState(0);
  const limit = 12;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: limit.toString() };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      const res = await axios.get("/api/products", { params });
      setProducts(res.data.products);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    axios.get("/api/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Product Catalog</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Browse and discover products across all GoDown warehouses
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-border bg-white text-[13px] md:text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 md:gap-2.5">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 md:px-4 py-2.5 md:py-3 border border-border bg-white text-[13px] md:text-[14px] focus:outline-none focus:border-foreground/20 transition-colors min-w-[140px] md:min-w-[160px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-[11px] md:text-[12px] text-muted-foreground">
        {total} product{total !== 1 ? "s" : ""} found
        {selectedCategory && ` in ${categories.find(c => c._id === selectedCategory)?.name}`}
        {search && ` matching "${search}"`}
      </p>

      {/* Product Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-3" strokeWidth={1} />
          <p className="text-[14px] font-medium text-muted-foreground">No products found</p>
          <p className="text-[12px] text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-4">
          {products.map((product) => (
            <button
              key={product._id}
              onClick={() => { setSelectedProduct(product); setMainImage(0); }}
              className="group surface p-0 overflow-hidden text-left hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="aspect-square bg-secondary/50 relative overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/20" strokeWidth={1} />
                  </div>
                )}
                {/* Stock badge */}
                {product.totalStock === 0 && (
                  <span className="absolute top-1 md:top-2 left-1 md:left-2 bg-destructive text-white text-[8px] md:text-[10px] font-medium px-1.5 md:px-2 py-0.5">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-3 md:p-4 space-y-1 md:space-y-1.5">
                {product.category && (
                  <p className="text-[10px] md:text-[10px] font-medium uppercase tracking-wider text-muted-foreground line-clamp-1">
                    {product.category.name}
                  </p>
                )}
                <h3 className="text-[13px] md:text-[14px] font-medium leading-snug line-clamp-2 group-hover:text-foreground/80 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between gap-1 pt-1 md:pt-1">
                  <span className="text-[15px] md:text-[16px] font-semibold">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] md:text-[11px] text-muted-foreground text-right">
                    per {product.unit}
                  </span>
                </div>
                <p className={`text-[10px] md:text-[11px] font-medium ${product.totalStock > 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {product.totalStock > 0 ? `${product.totalStock} in stock` : "Out of stock"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 md:gap-3 pt-4 md:pt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-2.5 md:px-3 py-2 md:py-2.5 text-[11px] md:text-[12px] border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <span className="text-[11px] md:text-[12px] text-muted-foreground px-2 md:px-3">
            Page {page}/{totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-2.5 md:px-3 py-2 md:py-2.5 text-[11px] md:text-[12px] border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row">
              {/* Image gallery */}
              <div className="md:w-1/2 bg-secondary/30">
                <div className="aspect-square relative overflow-hidden">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <Image
                      src={selectedProduct.images[mainImage]?.url ?? selectedProduct.images[0].url}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground/20" strokeWidth={1} />
                    </div>
                  )}
                </div>
                {/* Thumbnails */}
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex gap-1.5 p-3 overflow-x-auto">
                    {selectedProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMainImage(idx)}
                        className={`w-14 h-14 relative shrink-0 border-2 overflow-hidden transition-colors ${
                          mainImage === idx ? "border-foreground" : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <Image src={img.url} alt="" fill className="object-cover" sizes="56px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="md:w-1/2 p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    {selectedProduct.category && (
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        {selectedProduct.category.name}
                      </p>
                    )}
                    <h2 className="text-[18px] font-semibold leading-snug">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      SKU: {selectedProduct.sku}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-1.5 hover:bg-secondary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-bold">
                    ₹{selectedProduct.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    per {selectedProduct.unit}
                  </span>
                </div>

                {/* Stock */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium ${
                  selectedProduct.totalStock > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${selectedProduct.totalStock > 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                  {selectedProduct.totalStock > 0
                    ? `${selectedProduct.totalStock} units available`
                    : "Currently out of stock"
                  }
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Description
                    </p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Order CTA */}
                {selectedProduct.totalStock > 0 && (
                  <Link
                    href={`/catalog/orders/new?product=${selectedProduct._id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors btn-press mt-4"
                       onClick={() => setSelectedProduct(null)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Place Order
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
