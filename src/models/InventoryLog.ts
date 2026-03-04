import { Schema, model, models, Document, Types } from "mongoose";

export interface IInventoryLog extends Document {
  warehouse: Types.ObjectId;
  updatedBy: Types.ObjectId;
  productsUpdated: number;   // how many product stock counts were verified
  notes?: string;
  date: string;              // YYYY-MM-DD — one entry per day per warehouse
  createdAt: Date;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productsUpdated: { type: Number, required: true, min: 0 },
    notes: { type: String },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One log per warehouse per day
InventoryLogSchema.index({ warehouse: 1, date: 1 }, { unique: true });

export const InventoryLog =
  models.InventoryLog ||
  model<IInventoryLog>("InventoryLog", InventoryLogSchema);
