import { Schema, model, models, Document, Types } from "mongoose";

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
export type OrderType = "inbound" | "outbound";
export type DeliveryStatus = "unassigned" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed";

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  supplier?: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  notes?: string;
  createdBy: Types.ObjectId;
  processedAt?: Date;
  // Warehouse routing
  warehouse?: Types.ObjectId;        // which GoDown fulfils this order
  sourceWarehouse?: Types.ObjectId;  // fallback — original warehouse couldn't fulfil
  // Customer location
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerPincode?: string;
  customerCoordinates?: {
    lat: number;
    lng: number;
  };
  // Delivery partner fields
  deliveryPartner?: Types.ObjectId;
  deliveryVehicle?: string;
  deliveryStatus: DeliveryStatus;
  deliveryAddress?: string;
  deliveryNotes?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  autoAssigned?: boolean;            // was this auto-routed?
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ["inbound", "outbound"], required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    processedAt: { type: Date },
    // Warehouse routing
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    sourceWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    // Customer location
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    customerAddress: { type: String },
    customerPincode: { type: String, trim: true },
    customerCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    // Delivery partner fields
    deliveryPartner: { type: Schema.Types.ObjectId, ref: "Supplier" },
    deliveryVehicle: { type: String },
    deliveryStatus: {
      type: String,
      enum: ["unassigned", "assigned", "picked_up", "in_transit", "delivered", "failed"],
      default: "unassigned",
    },
    deliveryAddress: { type: String },
    deliveryNotes: { type: String },
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },
    autoAssigned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrderSchema.pre("save", function (next) {
  if (this.isNew && !this.orderNumber) {
    const prefix = this.type === "inbound" ? "PO" : "SO";
    this.orderNumber = `${prefix}-${Date.now()}`;
  }
  next();
});

export const Order = models.Order || model<IOrder>("Order", OrderSchema);
