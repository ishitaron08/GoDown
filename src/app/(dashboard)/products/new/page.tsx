"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import axios from "axios";
import { Loader2, Sparkles, ArrowLeft, Warehouse, Plus, X, ImageIcon } from "lucide-react";
import { generateSKU } from "@/lib/utils";
import Link from "next/link";
import { ImageUpload, UploadedImage } from "@/components/image-upload";

interface GoDown {
  _id: string;
  name: string;
  code: string;
  city: string;
}

interface GoDownAlloc {
  warehouseId: string;
  quantity: number;
}

const ProductSchema = z.object({
  name: z.string().min(2, "Name too short"),
  sku: z.string().min(2, "SKU too short"),
  description: z.string().optional(),
  category: z.string().min(1, "Select a category"),
  price: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0),
  minStockLevel: z.coerce.number().min(0),
  unit: z.string().default("pcs"),
  location: z.string().optional(),
});

type ProductForm = z.infer<typeof ProductSchema>;

const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5";
const inputCls =
  "w-full px-3 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [godowns, setGodowns] = useState<GoDown[]>([]);
  const [godownAllocs, setGodownAllocs] = useState<GoDownAlloc[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(ProductSchema),
    defaultValues: { quantity: 0, minStockLevel: 10, unit: "pcs" },
  });

  const watchName = watch("name");
  const watchCategory = watch("category");

  useEffect(() => {
    axios.get("/api/categories").then((res) => {
      setCategories(res.data);
    });
    axios.get("/api/warehouses").then((res) => {
      const list = res.data?.warehouses ?? res.data ?? [];
      setGodowns(list.map((w: any) => ({ _id: w._id, name: w.name, code: w.code, city: w.city })));
    }).catch(() => {});
  }, []);

  const handleAutoSKU = () => {
    const name = watchName;
    const catName =
      categories.find((c) => c._id === watchCategory)?.name ?? watchCategory;
    if (name)
      setValue("sku", generateSKU(name, catName || "GEN"), {
        shouldValidate: true,
      });
  };

  const handleAIDescription = async () => {
    const name = watchName;
    const catName = categories.find((c) => c._id === watchCategory)?.name;
    if (!name && !catName && images.length === 0) {
      toast.warning("Add a name, category, or image first");
      return;
    }
    setAiLoading(true);
    try {
      const res = await axios.post("/api/ai", {
        action: "describe-product",
        payload: {
          name: name || undefined,
          category: catName || undefined,
          imageUrl: images[0]?.url || undefined,
        },
      });
      setValue("description", res.data.description, { shouldValidate: true });
      toast.success("AI description generated");
    } catch (err: any) {
      const isQuota = err?.response?.data?.code === "quota_exceeded" || err?.response?.status === 402;
      toast.error(
        isQuota
          ? "OpenAI quota exceeded — please update your API key or add credits"
          : "AI description failed"
      );
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = async (data: ProductForm) => {
    setLoading(true);
    try {
      // Compute total qty from godown allocations (if any), or use form quantity
      const totalFromGodowns = godownAllocs.reduce((sum, a) => sum + a.quantity, 0);
      const payload = {
        ...data,
        images: images.map((img) => ({ url: img.url, fileId: img.fileId })),
        quantity: godownAllocs.length > 0 ? totalFromGodowns : data.quantity,
        godownAllocations: godownAllocs.length > 0 ? godownAllocs : undefined,
      };
      await axios.post("/api/products", payload);
      toast.success("Product created");
      router.push("/products");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create product";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // GoDown allocation helpers
  const usedGodownIds = new Set(godownAllocs.map((a) => a.warehouseId));
  const availableGodowns = godowns.filter((g) => !usedGodownIds.has(g._id));

  const addGodownAlloc = () => {
    if (availableGodowns.length === 0) return;
    setGodownAllocs((prev) => [
      ...prev,
      { warehouseId: availableGodowns[0]._id, quantity: 0 },
    ]);
  };

  const removeGodownAlloc = (idx: number) => {
    setGodownAllocs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateGodownAlloc = (idx: number, field: "warehouseId" | "quantity", value: string | number) => {
    setGodownAllocs((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, [field]: field === "quantity" ? Number(value) : value } : a
      )
    );
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="h-8 w-8 flex items-center justify-center border border-border hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Add Product</h1>
          <p className="text-[13px] text-muted-foreground">
            Create a new warehouse product
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="surface p-8 space-y-6"
      >
        {/* Name */}
        <div>
          <label className={labelCls}>Product Name *</label>
          <input
            {...register("name")}
            className={inputCls}
            placeholder="e.g. Steel Rod 10mm"
          />
          {errors.name && (
            <p className="text-[11px] text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* SKU */}
        <div>
          <label className={labelCls}>SKU *</label>
          <div className="flex gap-2">
            <input
              {...register("sku")}
              className={`${inputCls} flex-1`}
              placeholder="e.g. MTL-STLRD-1234"
            />
            <button
              type="button"
              onClick={handleAutoSKU}
              className="px-3 py-2 text-[11px] font-medium border border-border hover:bg-secondary transition-colors btn-press whitespace-nowrap"
            >
              Auto-generate
            </button>
          </div>
          {errors.sku && (
            <p className="text-[11px] text-destructive mt-1">
              {errors.sku.message}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category *</label>
            <select {...register("category")} className={inputCls}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls} style={{ marginBottom: 0 }}>
              Description
            </label>
            <button
              type="button"
              onClick={handleAIDescription}
              disabled={aiLoading}
              className="flex items-center gap-1.5 text-[11px] font-medium text-neon hover:text-neon/80 disabled:opacity-40 transition-colors"
            >
              {aiLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI Generate
            </button>
          </div>
          <textarea
            {...register("description")}
            rows={3}
            className={inputCls}
            placeholder="Product description..."
          />
        </div>

        {/* Product Images */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            <label className={labelCls} style={{ marginBottom: 0 }}>
              Product Images
            </label>
          </div>
          <ImageUpload
            images={images}
            onChange={setImages}
            maxImages={5}
            folder="products"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            First image is the main image. Max 5 images, 5 MB each.
          </p>
        </div>

        {/* Price + Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Selling Price (₹) *</label>
            <input
              {...register("price")}
              type="number"
              step="0.01"
              className={inputCls}
              placeholder="0.00"
            />
            {errors.price && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.price.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Cost Price (₹) *</label>
            <input
              {...register("costPrice")}
              type="number"
              step="0.01"
              className={inputCls}
              placeholder="0.00"
            />
            {errors.costPrice && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.costPrice.message}
              </p>
            )}
          </div>
        </div>

        {/* Qty + Min Stock + Unit */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>
              {godownAllocs.length > 0 ? "Total Qty (auto)" : "Initial Qty"}
            </label>
            <input
              {...register("quantity")}
              type="number"
              className={inputCls}
              placeholder="0"
              readOnly={godownAllocs.length > 0}
              value={
                godownAllocs.length > 0
                  ? godownAllocs.reduce((s, a) => s + a.quantity, 0)
                  : undefined
              }
            />
            {godownAllocs.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Sum of GoDown allocations
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Min Stock Level</label>
            <input
              {...register("minStockLevel")}
              type="number"
              className={inputCls}
              placeholder="10"
            />
          </div>
          <div>
            <label className={labelCls}>Unit</label>
            <input
              {...register("unit")}
              className={inputCls}
              placeholder="pcs"
            />
          </div>
        </div>

        {/* ── GoDown Stock Allocation ── */}
        <div className="border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <label className={labelCls} style={{ marginBottom: 0 }}>
                GoDown Allocation
              </label>
            </div>
            <button
              type="button"
              onClick={addGodownAlloc}
              disabled={availableGodowns.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-border hover:bg-secondary disabled:opacity-40 transition-colors btn-press"
            >
              <Plus className="h-3 w-3" />
              Add GoDown
            </button>
          </div>

          {godowns.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-2">
              No GoDowns created yet.{" "}
              <Link href="/warehouses" className="underline underline-offset-2 hover:text-foreground">
                Create a GoDown first
              </Link>
            </p>
          ) : godownAllocs.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-2">
              No GoDown assigned. Click &quot;Add GoDown&quot; to allocate initial stock to specific GoDowns.
            </p>
          ) : (
            <div className="space-y-2">
              {godownAllocs.map((alloc, idx) => {
                const gd = godowns.find((g) => g._id === alloc.warehouseId);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={alloc.warehouseId}
                        onChange={(e) => updateGodownAlloc(idx, "warehouseId", e.target.value)}
                        className={inputCls}
                      >
                        {/* Current selection always shown */}
                        {gd && (
                          <option value={gd._id}>
                            {gd.name} ({gd.code}) — {gd.city}
                          </option>
                        )}
                        {/* Available (unselected) GoDowns */}
                        {godowns
                          .filter((g) => g._id !== alloc.warehouseId && !usedGodownIds.has(g._id))
                          .map((g) => (
                            <option key={g._id} value={g._id}>
                              {g.name} ({g.code}) — {g.city}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        value={alloc.quantity}
                        onChange={(e) => updateGodownAlloc(idx, "quantity", e.target.value)}
                        placeholder="Qty"
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGodownAlloc(idx)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground pt-1">
                Total: {godownAllocs.reduce((s, a) => s + a.quantity, 0)} units across {godownAllocs.length} GoDown{godownAllocs.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className={labelCls}>Storage Location</label>
          <input
            {...register("location")}
            className={inputCls}
            placeholder="e.g. Rack A-3, Shelf 2"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors btn-press"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "Creating..." : "Create Product"}
          </button>
          <Link
            href="/products"
            className="px-6 py-2.5 border border-border text-[13px] font-medium text-muted-foreground hover:bg-secondary transition-colors btn-press"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
