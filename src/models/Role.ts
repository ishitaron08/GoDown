import { Schema, model, models, Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;   // Cannot be deleted (admin, manager, staff, delivery-partner)
  isDefault: boolean;  // Assigned to new users by default
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ensure only one default role
RoleSchema.pre("save", async function (next) {
  if (this.isDefault) {
    const Role = models.Role || model<IRole>("Role", RoleSchema);
    await Role.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

export const Role = models.Role || model<IRole>("Role", RoleSchema);
