import { config } from "dotenv";
import { resolve } from "path";
// Load .env.local from project root
config({ path: resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.DATABASE_URL!;

// ─── Default role definitions ───
const DEFAULT_ROLES = [
  {
    name: "Admin",
    slug: "admin",
    description: "Full system access — manage everything including users and roles",
    permissions: [
      "dashboard:view",
      "products:view", "products:create", "products:edit", "products:delete",
      "inventory:view", "inventory:create", "inventory:edit",
      "orders:view", "orders:create", "orders:edit", "orders:delete",
      "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
      "categories:view", "categories:create", "categories:edit", "categories:delete",
      "reports:view", "reports:export",
      "ai:view", "ai:use",
      "users:view", "users:create", "users:edit", "users:delete",
      "roles:view", "roles:create", "roles:edit", "roles:delete",
      "settings:view", "settings:edit",
      "upload:create",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Manage products, orders, inventory, suppliers — can manage staff & below",
    permissions: [
      "dashboard:view",
      "products:view", "products:create", "products:edit", "products:delete",
      "inventory:view", "inventory:create", "inventory:edit",
      "orders:view", "orders:create", "orders:edit", "orders:delete",
      "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
      "categories:view", "categories:create", "categories:edit", "categories:delete",
      "reports:view", "reports:export",
      "ai:view", "ai:use",
      "upload:create",
      "users:view", "users:edit", "settings:view",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "Staff",
    slug: "staff",
    description: "Day-to-day operations — view and create, limited editing",
    permissions: [
      "dashboard:view",
      "products:view", "products:create",
      "inventory:view", "inventory:create",
      "orders:view", "orders:create",
      "suppliers:view",
      "categories:view",
      "reports:view",
      "ai:view",
      "upload:create",
    ],
    isSystem: true,
    isDefault: false,  // internal role — assigned by admins only
  },
  {
    name: "Customer",
    slug: "customer",
    description: "External customer — browse product catalog and place/track their own orders",
    permissions: [
      "products:view",
      "orders:view",
      "orders:create",
    ],
    isSystem: true,
    isDefault: true,  // all public self-registrations become customers
  },
  {
    name: "Delivery Partner",
    slug: "delivery-partner",
    description: "Handles deliveries — view assigned orders with addresses, update delivery status",
    permissions: [
      "dashboard:view",
      "orders:view",
      "orders:edit",
      "suppliers:view",
    ],
    isSystem: true,
    isDefault: false,
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Drop and re-create
  const db = mongoose.connection.db!;

  // ─── Role Schema ───
  const RoleSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true, lowercase: true },
    description: String,
    permissions: [String],
    isSystem: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
  }, { timestamps: true });
  const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);

  // ─── User Schema ───
  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, default: "staff" },
    isActive: { type: Boolean, default: true },
  });
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const CategorySchema = new mongoose.Schema({ name: String, slug: String });
  const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);

  const SupplierSchema = new mongoose.Schema({ name: String, email: String, phone: String, isActive: { type: Boolean, default: true } });
  const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);

  // ─── Seed Roles ───
  for (const roleDef of DEFAULT_ROLES) {
    await Role.findOneAndUpdate(
      { slug: roleDef.slug },
      roleDef,
      { upsert: true, new: true }
    );
  }
  console.log("Roles seeded:", DEFAULT_ROLES.length);

  // ─── Seed Admin User ───
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await User.findOneAndUpdate(
    { email: "admin@godown.com" },
    { name: "Admin User", email: "admin@godown.com", password: adminPassword, role: "admin", isActive: true },
    { upsert: true, new: true }
  );
  console.log("Admin user:", admin.email);

  // Categories
  const categories = ["Electronics", "Raw Materials", "Hardware", "Chemicals", "Packaging", "Tools"];
  const catDocs = await Promise.all(
    categories.map((name) =>
      Category.findOneAndUpdate(
        { slug: name.toLowerCase() },
        { name, slug: name.toLowerCase() },
        { upsert: true, new: true }
      )
    )
  );
  console.log("Categories seeded:", catDocs.length);

  // Suppliers
  const supplierData = [
    { name: "Tata Metals Ltd", email: "sales@tatametals.com", phone: "9876543210" },
    { name: "Reliance Supply Co", email: "orders@reliancesupply.in", phone: "9123456789" },
    { name: "ABC Packaging", email: "info@abcpack.com", phone: "8888888888" },
  ];
  const supDocs = await Promise.all(
    supplierData.map((s) =>
      Supplier.findOneAndUpdate({ name: s.name }, { ...s, isActive: true }, { upsert: true, new: true })
    )
  );
  console.log("Suppliers seeded:", supDocs.length);

  console.log("\n✅ Seed complete!");
  console.log("Login: admin@godown.com / admin123");
  console.log("\nDefault roles created:");
  DEFAULT_ROLES.forEach((r) => {
    console.log(`  • ${r.name} (${r.slug}) — ${r.permissions.length} permissions${r.isDefault ? " [DEFAULT]" : ""}`);
  });
  await mongoose.disconnect();
}

seed().catch(console.error);
