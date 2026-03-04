import { Schema, model, models, Document, Types } from "mongoose";

export interface IWarehouseStock extends Document {
  warehouse: Types.ObjectId;
  product: Types.ObjectId;
  quantity: number;
  lastUpdated: Date;         // when manager last verified/updated this stock
  updatedBy: Types.ObjectId; // who updated it
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseStockSchema = new Schema<IWarehouseStock>(
  {
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// One row per product per warehouse
WarehouseStockSchema.index({ warehouse: 1, product: 1 }, { unique: true });
WarehouseStockSchema.index({ product: 1, quantity: 1 });
WarehouseStockSchema.index({ warehouse: 1, lastUpdated: 1 });

export const WarehouseStock =
  models.WarehouseStock ||
  model<IWarehouseStock>("WarehouseStock", WarehouseStockSchema);
