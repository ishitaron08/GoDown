import { Schema, model, models, Document, Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  description?: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    slug: { type: String, required: true, unique: true, lowercase: true },
  },
  { timestamps: true }
);

export const Category = models.Category || model<ICategory>("Category", CategorySchema);
