import { Schema, model, models, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;           // slug of the Role document (e.g. "admin", "manager", "staff", "delivery-partner", or custom)
  avatar?: string;
  assignedWarehouse?: Types.ObjectId;  // For delivery partners: warehouse they're assigned to
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      default: "staff",     // matches the default Role slug
    },
    avatar: { type: String },
    assignedWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
