import { Schema, model, models, Document } from "mongoose";

export interface IVehicle {
  vehicleNumber: string;
  vehicleType: string;   // e.g. "Truck", "Van", "Bike", "Tempo"
  capacity?: number;     // in kg
  isAvailable: boolean;
}

export interface ISupplier extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  vehicles: IVehicle[];
  isActive: boolean;
  userId?: Schema.Types.ObjectId;  // linked User account for delivery-partner login
  assignedWarehouse?: Schema.Types.ObjectId;  // the GoDown this partner is assigned to
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>({
  vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
  vehicleType: { type: String, required: true, trim: true },
  capacity: { type: Number },
  isAvailable: { type: Boolean, default: true },
});

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true },
    phone: { type: String },
    address: { type: String },
    pincode: { type: String, trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    vehicles: { type: [VehicleSchema], default: [] },
    isActive: { type: Boolean, default: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  },
  { timestamps: true }
);

export const Supplier = models.Supplier || model<ISupplier>("Supplier", SupplierSchema);
