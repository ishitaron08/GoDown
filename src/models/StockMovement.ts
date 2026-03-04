import { Schema, model, models, Document, Types } from "mongoose";

export type MovementType = "in" | "out" | "adjustment" | "transfer";

export interface IStockMovement extends Document {
  product: Types.ObjectId;
  type: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reference?: string;
  reason?: string;
  performedBy: Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: {
      type: String,
      enum: ["in", "out", "adjustment", "transfer"],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reference: { type: String },
    reason: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockMovementSchema.index({ product: 1, createdAt: -1 });
StockMovementSchema.index({ createdAt: -1 });

export const StockMovement =
  models.StockMovement ||
  model<IStockMovement>("StockMovement", StockMovementSchema);
