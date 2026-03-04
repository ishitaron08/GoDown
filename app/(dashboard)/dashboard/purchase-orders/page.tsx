"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Eye,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Truck,
} from "lucide-react";

interface PurchaseOrder {
  id: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  vendor?: { name: string };
  createdBy?: { name: string };
  approvedBy?: { name: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product?: { name: string };
  }>;
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  costPrice: number;
  vendorId: string;
}

export default function PurchaseOrdersPage() {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendorId: "",
    notes: "",
    items: [{ productId: "", quantity: "1", unitPrice: "" }],
  });

  const fetchPOs = useCallback(async () => {
    try {
      const res = await fetch(`/api/purchase-orders?search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setPOs(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch POs:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPOs();
    Promise.all([
      fetch("/api/vendors?limit=200").then((r) => r.json()),
      fetch("/api/products?limit=200").then((r) => r.json()),
    ]).then(([v, p]) => {
      setVendors(v.data || []);
      setProducts(p.data || []);
    });
  }, [fetchPOs]);

  const filteredProducts = form.vendorId
    ? products.filter((p) => p.vendorId === form.vendorId)
    : products;

  const resetForm = () => {
    setForm({
      vendorId: "",
      notes: "",
      items: [{ productId: "", quantity: "1", unitPrice: "" }],
    });
  };

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: "", quantity: "1", unitPrice: "" }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        vendorId: form.vendorId,
        notes: form.notes || undefined,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
      };

      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        fetchPOs();
      }
    } catch (error) {
      console.error("Failed to create PO:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      fetchPOs();
    } catch (error) {
      console.error("Failed to approve PO:", error);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: reason }),
      });
      fetchPOs();
    } catch (error) {
      console.error("Failed to reject PO:", error);
    }
  };

  const handleFulfill = async (id: string) => {
    try {
      await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fulfill" }),
      });
      fetchPOs();
    } catch (error) {
      console.error("Failed to fulfill PO:", error);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning" as const;
      case "APPROVED":
        return "success" as const;
      case "REJECTED":
        return "destructive" as const;
      case "FULFILLED":
        return "default" as const;
      case "CANCELLED":
        return "secondary" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground">
            SAP-inspired procurement workflow with approval chain
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
                <DialogDescription>
                  Submit a new purchase order for vendor approval
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <Select
                    value={form.vendorId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, vendorId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Line Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select
                          value={item.productId}
                          onValueChange={(v) =>
                            updateItem(i, "productId", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        className="w-16"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(i, "quantity", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(i, "unitPrice", e.target.value)
                        }
                      />
                      {form.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit PO
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* PO lifecycle info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">PO Lifecycle</CardTitle>
          <CardDescription className="flex gap-2 flex-wrap">
            <Badge variant="warning">PENDING</Badge>
            <span>→</span>
            <Badge variant="success">APPROVED</Badge>
            <span>→</span>
            <Badge>FULFILLED</Badge>
            <span className="text-muted-foreground ml-2">|</span>
            <Badge variant="destructive">REJECTED</Badge>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailPO}
        onOpenChange={(open) => !open && setDetailPO(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          {detailPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>{" "}
                  {detailPO.vendor?.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={statusVariant(detailPO.status)}>
                    {detailPO.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created by:</span>{" "}
                  {detailPO.createdBy?.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Approved by:</span>{" "}
                  {detailPO.approvedBy?.name || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <strong>${detailPO.totalAmount.toFixed(2)}</strong>
                </div>
              </div>
              {detailPO.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  {detailPO.notes}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPO.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchase orders..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No purchase orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs">
                        {po.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{po.vendor?.name || "—"}</TableCell>
                      <TableCell>{po.createdBy?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(po.status)}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${po.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(po.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDetailPO(po)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {po.status === "PENDING" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(po.id)}
                                title="Approve"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(po.id)}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {po.status === "APPROVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleFulfill(po.id)}
                              title="Mark Fulfilled"
                            >
                              <Truck className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
