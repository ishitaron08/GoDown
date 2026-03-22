import { Schema, model, models, Document, Types } from "mongoose";

export interface IWarehouse extends Document {
  name: string;
  code: string;            // unique short code e.g. "GD-NOIDA", "GD-DEL"
  address: string;
  city: string;
  pincode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  manager: Types.ObjectId; // ref User — the store manager
  deliveryPartners: Types.ObjectId[]; // ref User (delivery-partner role)
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    manager: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deliveryPartners: [{ type: Schema.Types.ObjectId, ref: "User" }],
    phone: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WarehouseSchema.index({ pincode: 1 });
WarehouseSchema.index({ "coordinates.lat": 1, "coordinates.lng": 1 });

export const Warehouse =
  models.Warehouse || model<IWarehouse>("Warehouse", WarehouseSchema);
