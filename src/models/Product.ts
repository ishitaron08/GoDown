import { Schema, model, models, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku: string;
  description?: string;
  category: Types.ObjectId;
  supplier?: Types.ObjectId;
  price: number;
  costPrice: number;
  quantity: number;
  minStockLevel: number;
  unit: string;
  location?: string;
  images: { url: string; fileId: string }[];
  isActive: boolean;
  tags: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    minStockLevel: { type: Number, required: true, default: 10 },
    unit: { type: String, default: "pcs" },
    location: { type: String },
    images: [
      {
        url: { type: String },
        fileId: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", sku: "text", tags: "text" });
ProductSchema.index({ category: 1, isActive: 1 });

export const Product = models.Product || model<IProduct>("Product", ProductSchema);
