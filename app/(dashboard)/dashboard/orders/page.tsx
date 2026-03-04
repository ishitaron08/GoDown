"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Eye, Loader2, X } from "lucide-react";

interface Order {
  id: string;
  type: string;
  status: string;
  totalAmount: number;
  consumer?: { name: string };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product?: { name: string } | null;
    service?: { name: string } | null;
  }>;
  createdAt: string;
}

interface Consumer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Service {
  id: string;
  name: string;
  basePrice: number;
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const preselectedProduct = searchParams.get("product");

  const [orders, setOrders] = useState<Order[]>([]);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "PRODUCT" as "PRODUCT" | "SERVICE",
    consumerId: "",
    items: [{ productId: "", serviceId: "", quantity: "1" }],
  });

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOrders();
    Promise.all([
      fetch("/api/consumers?limit=200").then((r) => r.json()),
      fetch("/api/products?limit=200").then((r) => r.json()),
      fetch("/api/services?limit=200").then((r) => r.json()),
    ]).then(([c, p, s]) => {
      setConsumers(c.data || []);
      setProducts(p.data || []);
      setServices(s.data || []);

      // Auto-open dialog with preselected product from query param
      if (preselectedProduct) {
        setForm((f) => ({
          ...f,
          type: "PRODUCT",
          items: [{ productId: preselectedProduct, serviceId: "", quantity: "1" }],
        }));
        setDialogOpen(true);
      }
    });
  }, [fetchOrders, preselectedProduct]);

  const resetForm = () => {
    setForm({
      type: "PRODUCT",
      consumerId: "",
      items: [{ productId: "", serviceId: "", quantity: "1" }],
    });
  };

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: "", serviceId: "", quantity: "1" }],
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
        type: form.type,
        consumerId: form.consumerId,
        items: form.items.map((item) => ({
          ...(form.type === "PRODUCT"
            ? { productId: item.productId }
            : { serviceId: item.serviceId }),
          quantity: parseInt(item.quantity),
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to create order:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
    } catch (error) {
      console.error("Failed to update order:", error);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning" as const;
      case "CONFIRMED":
        return "default" as const;
      case "SHIPPED":
        return "default" as const;
      case "DELIVERED":
        return "success" as const;
      case "CANCELLED":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage customer orders and fulfillment
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
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
                <DialogDescription>
                  Create a product or service order
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order Type *</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v: "PRODUCT" | "SERVICE") =>
                        setForm((f) => ({ ...f, type: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRODUCT">Product</SelectItem>
                        <SelectItem value="SERVICE">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Consumer *</Label>
                    <Select
                      value={form.consumerId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, consumerId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select consumer" />
                      </SelectTrigger>
                      <SelectContent>
                        {consumers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Order Items</Label>
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
                          value={
                            form.type === "PRODUCT"
                              ? item.productId
                              : item.serviceId
                          }
                          onValueChange={(v) =>
                            updateItem(
                              i,
                              form.type === "PRODUCT"
                                ? "productId"
                                : "serviceId",
                              v
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={`Select ${form.type.toLowerCase()}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {form.type === "PRODUCT"
                              ? products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} (${p.price})
                                  </SelectItem>
                                ))
                              : services.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} (${s.basePrice})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(i, "quantity", e.target.value)
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
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Order
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!detailOrder}
        onOpenChange={(open) => !open && setDetailOrder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  <Badge variant="outline">{detailOrder.type}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={statusVariant(detailOrder.status)}>
                    {detailOrder.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Consumer:</span>{" "}
                  {detailOrder.consumer?.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <strong>${detailOrder.totalAmount.toFixed(2)}</strong>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product?.name || item.service?.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice.toFixed(2)}
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
                placeholder="Search orders..."
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
                  <TableHead>Consumer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{order.consumer?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${order.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDetailOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === "PENDING" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateOrderStatus(order.id, "CONFIRMED")
                                }
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  updateOrderStatus(order.id, "CANCELLED")
                                }
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {order.status === "CONFIRMED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.id, "SHIPPED")
                              }
                            >
                              Ship
                            </Button>
                          )}
                          {order.status === "SHIPPED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateOrderStatus(order.id, "DELIVERED")
                              }
                            >
                              Deliver
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
