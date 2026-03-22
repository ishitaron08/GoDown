import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.DATABASE_URL!;

// ─── Role definitions ───
const DEFAULT_ROLES = [
  {
    name: "Admin",
    slug: "admin",
    description: "Full system access",
    permissions: [
      "dashboard:view", "products:view", "products:create", "products:edit", "products:delete",
      "inventory:view", "inventory:create", "inventory:edit", "orders:view", "orders:create",
      "orders:edit", "orders:delete", "suppliers:view", "suppliers:create", "suppliers:edit",
      "suppliers:delete", "categories:view", "categories:create", "categories:edit",
      "categories:delete", "reports:view", "reports:export", "ai:view", "ai:use",
      "users:view", "users:create", "users:edit", "users:delete", "roles:view",
      "roles:create", "roles:edit", "roles:delete", "settings:view", "settings:edit",
      "upload:create", "warehouses:view", "warehouses:edit",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Manage operations",
    permissions: [
      "dashboard:view", "products:view", "products:create", "products:edit",
      "inventory:view", "inventory:create", "inventory:edit", "orders:view",
      "orders:create", "orders:edit", "suppliers:view", "suppliers:create",
      "suppliers:edit", "categories:view", "categories:create", "categories:edit",
      "reports:view", "reports:export", "ai:view", "ai:use", "upload:create",
      "users:view", "users:edit", "settings:view", "warehouses:view", "warehouses:edit",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "Staff",
    slug: "staff",
    description: "Day-to-day operations",
    permissions: [
      "dashboard:view", "products:view", "products:create", "inventory:view",
      "inventory:create", "orders:view", "orders:create", "suppliers:view",
      "categories:view", "reports:view", "ai:view", "upload:create", "warehouses:view",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "Customer",
    slug: "customer",
    description: "Browse and order products",
    permissions: ["products:view", "orders:view", "orders:create"],
    isSystem: true,
    isDefault: true,
  },
  {
    name: "Delivery Partner",
    slug: "delivery-partner",
    description: "Handle deliveries",
    permissions: ["dashboard:view", "deliveries:view", "orders:edit", "suppliers:view", "warehouses:view"],
    isSystem: true,
    isDefault: false,
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("✓ Connected to MongoDB\n");

  // ─── Import Models ───
  const { Role } = await import("../models/Role");
  const { User } = await import("../models/User");
  const { Category } = await import("../models/Category");
  const { Product } = await import("../models/Product");
  const { Warehouse } = await import("../models/Warehouse");
  const { WarehouseStock } = await import("../models/WarehouseStock");
  const { Order } = await import("../models/Order");

  // ─── Seed Roles ───
  console.log("📋 Seeding Roles...");
  for (const roleDef of DEFAULT_ROLES) {
    await Role.findOneAndUpdate({ slug: roleDef.slug }, roleDef, { upsert: true });
  }
  console.log(`  ✓ ${DEFAULT_ROLES.length} roles seeded\n`);

  // ─── Seed Users ───
  console.log("👥 Creating Demo Users...");
  const DEMO_PASSWORD = "demo@2026";
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demoUsers = [
    { name: "Admin User", email: "admin@godown.com", role: "admin" },
    { name: "Manager Demo", email: "manager@godown.com", role: "manager" },
    { name: "Staff Member", email: "staff@godown.com", role: "staff" },
    { name: "John Customer", email: "customer@godown.com", role: "customer" },
    { name: "Delivery Partner", email: "delivery@godown.com", role: "delivery-partner" },
  ];

  const userDocs: any = {};
  for (const user of demoUsers) {
    const doc = await User.findOneAndUpdate(
      { email: user.email },
      { name: user.name, email: user.email, password: hashedPassword, role: user.role, isActive: true },
      { upsert: true, new: true }
    );
    userDocs[user.email] = doc;
    console.log(`  ✓ ${user.name} (${user.role})`);
  }
  console.log("");

  // ─── Seed Categories ───
  console.log("📁 Creating Categories...");
  const categories = ["Electronics", "Raw Materials", "Hardware", "Chemicals", "Packaging", "Tools"];
  const categoryDocs: any = {};
  for (const cat of categories) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.toLowerCase() },
      { name: cat, slug: cat.toLowerCase() },
      { upsert: true, new: true }
    );
    categoryDocs[cat] = doc;
  }
  console.log(`  ✓ ${categories.length} categories seeded\n`);

  // ─── Seed Warehouses ───
  console.log("🏭 Creating Warehouses (Godowns)...");
  const manager = userDocs["manager@godown.com"]; // Assign to manager
  const delivery = userDocs["delivery@godown.com"]; // Assign to delivery partner

  const warehouseData = [
    { name: "Central Warehouse", code: "GD-MUM", address: "Mumbai Warehouse, India", city: "Mumbai", pincode: "400001", lat: 19.076, lng: 72.877 },
    { name: "North Godown", code: "GD-DEL", address: "Delhi Distribution Hub", city: "Delhi", pincode: "110001", lat: 28.704, lng: 77.102 },
    { name: "East Storage", code: "GD-KOL", address: "Kolkata Branch Office", city: "Kolkata", pincode: "700001", lat: 22.572, lng: 88.363 },
  ];

  const warehouseDocs: any = {};
  for (const w of warehouseData) {
    const doc = await Warehouse.findOneAndUpdate(
      { code: w.code },
      {
        name: w.name,
        code: w.code,
        address: w.address,
        city: w.city,
        pincode: w.pincode,
        coordinates: { lat: w.lat, lng: w.lng },
        manager: manager._id,
        deliveryPartners: [delivery._id],  // Assign delivery partner to first warehouse (GD-MUM)
        isActive: true
      },
      { upsert: true, new: true }
    );
    warehouseDocs[w.code] = doc;
    console.log(`  ✓ ${w.name} (${w.city}) - Code: ${w.code}`);
  }
  console.log("");

  // ─── Assign delivery partner to warehouse ───
  const deliveryPartner = delivery._id;
  await User.findByIdAndUpdate(
    deliveryPartner,
    { assignedWarehouse: warehouseDocs["GD-MUM"]._id },
    { new: true }
  );
  console.log("  ✓ Assigned delivery partner to GD-MUM warehouse\n");

  // ─── Seed Products ───
  console.log("📦 Creating Demo Products...");
  const admin = userDocs["admin@godown.com"];

  const productData = [
    { name: "Industrial Bearings", sku: "SKU-001", category: "Hardware", price: 150, costPrice: 100, unit: "pcs", minStockLevel: 50 },
    { name: "Steel Rods", sku: "SKU-002", category: "Raw Materials", price: 80, costPrice: 50, unit: "kg", minStockLevel: 100 },
    { name: "Electronic Components", sku: "SKU-003", category: "Electronics", price: 200, costPrice: 120, unit: "pcs", minStockLevel: 30 },
    { name: "Packaging Boxes", sku: "SKU-004", category: "Packaging", price: 10, costPrice: 5, unit: "boxes", minStockLevel: 500 },
    { name: "Chemical Solvent", sku: "SKU-005", category: "Chemicals", price: 350, costPrice: 200, unit: "liters", minStockLevel: 20 },
    { name: "Power Drill Tool", sku: "SKU-006", category: "Tools", price: 450, costPrice: 300, unit: "pcs", minStockLevel: 10 },
  ];

  const productDocs: any = {};
  for (const p of productData) {
    const doc = await Product.findOneAndUpdate(
      { sku: p.sku },
      {
        name: p.name,
        sku: p.sku,
        category: categoryDocs[p.category]._id,
        price: p.price,
        costPrice: p.costPrice,
        unit: p.unit,
        minStockLevel: p.minStockLevel,
        quantity: 500, // Total quantity
        isActive: true,
        createdBy: admin._id,
        images: [],
        tags: [p.category],
      },
      { upsert: true, new: true }
    );
    productDocs[p.sku] = doc;
    console.log(`  ✓ ${p.name} (${p.sku}) - ₹${p.price}/${p.unit}`);
  }
  console.log("");

  // ─── Seed Warehouse Stock ───
  console.log("📊 Creating Warehouse Inventory...");
  const warehouseCodes = Object.keys(warehouseDocs);
  const staff = userDocs["staff@godown.com"];

  for (const sku of Object.keys(productDocs)) {
    for (const code of warehouseCodes) {
      const quantity = Math.floor(Math.random() * 500) + 100;
      await WarehouseStock.findOneAndUpdate(
        { product: productDocs[sku]._id, warehouse: warehouseDocs[code]._id },
        {
          quantity,
          updatedBy: staff._id,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    }
  }
  console.log(`  ✓ Inventory created for ${Object.keys(productDocs).length} products × ${warehouseCodes.length} warehouses\n`);

  // ─── Seed Demo Orders ───
  console.log("📋 Creating Demo Orders (Complete Workflow)...");

  const customer = userDocs["customer@godown.com"];

  // Helper to create order items
  const createOrderItems = (skus: string[], quantities: number[]) => {
    return skus.map((sku, i) => ({
      product: productDocs[sku]._id,
      quantity: quantities[i],
      unitPrice: productDocs[sku].price,
      totalPrice: productDocs[sku].price * quantities[i],
    }));
  };

  // Order 1: PENDING (just placed, waiting admin approval)
  const order1Items = createOrderItems(["SKU-001"], [5]);
  await Order.findOneAndUpdate(
    { orderNumber: "SO-PENDING-001" },
    {
      orderNumber: "SO-PENDING-001",
      type: "outbound",
      status: "pending",
      items: order1Items,
      totalAmount: order1Items.reduce((sum, item) => sum + item.totalPrice, 0),
      createdBy: customer._id,
      customerName: "John Doe",
      customerPhone: "9876543210",
      customerAddress: "123 Main Street, Mumbai",
      customerPincode: "400001",
      deliveryStatus: "unassigned",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    { upsert: true, new: true }
  );

  // Order 2: PROCESSING (approved, ready for warehouse pickup, delivery assigned)
  const order2Items = createOrderItems(["SKU-003", "SKU-004"], [10, 100]);
  await Order.findOneAndUpdate(
    { orderNumber: "SO-PROCESSING-001" },
    {
      orderNumber: "SO-PROCESSING-001",
      type: "outbound",
      status: "processing",
      items: order2Items,
      totalAmount: order2Items.reduce((sum, item) => sum + item.totalPrice, 0),
      createdBy: customer._id,
      warehouse: warehouseDocs["GD-MUM"]._id,
      deliveryPartner: delivery._id,
      customerName: "Jane Smith",
      customerPhone: "9123456789",
      customerAddress: "456 Market Square, Delhi",
      customerPincode: "110001",
      deliveryStatus: "assigned",
      processedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    { upsert: true, new: true }
  );

  // Order 3: In Transit (assigned to delivery partner)
  const order3Items = createOrderItems(["SKU-002"], [50]);
  await Order.findOneAndUpdate(
    { orderNumber: "SO-INTRANSIT-001" },
    {
      orderNumber: "SO-INTRANSIT-001",
      type: "outbound",
      status: "processing",
      items: order3Items,
      totalAmount: order3Items.reduce((sum, item) => sum + item.totalPrice, 0),
      createdBy: customer._id,
      warehouse: warehouseDocs["GD-MUM"]._id,
      deliveryPartner: delivery._id,
      customerName: "Raj Kumar",
      customerPhone: "8888888888",
      customerAddress: "789 Commerce Lane, Kolkata",
      customerPincode: "700001",
      deliveryStatus: "in_transit",
      deliveryAddress: "789 Commerce Lane, Kolkata",
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      processedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    { upsert: true, new: true }
  );

  // Order 4: Delivered (completed)
  const order4Items = createOrderItems(["SKU-005", "SKU-006"], [5, 2]);
  await Order.findOneAndUpdate(
    { orderNumber: "SO-DELIVERED-001" },
    {
      orderNumber: "SO-DELIVERED-001",
      type: "outbound",
      status: "completed",
      items: order4Items,
      totalAmount: order4Items.reduce((sum, item) => sum + item.totalPrice, 0),
      createdBy: customer._id,
      warehouse: warehouseDocs["GD-MUM"]._id,
      deliveryPartner: delivery._id,
      customerName: "Priya Sharma",
      customerPhone: "7777777777",
      customerAddress: "321 Industrial Park, Mumbai",
      customerPincode: "400001",
      deliveryStatus: "delivered",
      deliveryAddress: "321 Industrial Park, Mumbai",
      actualDelivery: new Date(Date.now() - 12 * 60 * 60 * 1000),
      processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    { upsert: true, new: true }
  );

  console.log(`  ✓ SO-PENDING-001 - PENDING (awaiting admin approval)`);
  console.log(`  ✓ SO-PROCESSING-001 - PROCESSING (in warehouse)`);
  console.log(`  ✓ SO-INTRANSIT-001 - IN TRANSIT (delivery in progress)`);
  console.log(`  ✓ SO-DELIVERED-001 - DELIVERED (completed)\n`);

  // ─── Summary ───
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║" + " SEED COMPLETE - DEMO DATA READY FOR INSPECTION".padEnd(59) + "║");
  console.log("╚" + "═".repeat(58) + "╝\n");

  console.log("📖 DEMO CREDENTIALS (Password: " + DEMO_PASSWORD + "):");
  console.log("─".repeat(60));
  demoUsers.forEach((u) => {
    const info = `${u.email.padEnd(25)} → ${u.role.padEnd(17)}`;
    if (u.role === "customer") console.log(`👤 ${info} [PLACE ORDERS]`);
    else if (u.role === "admin") console.log(`👑 ${info} [APPROVE/PROCESS]`);
    else if (u.role === "manager") console.log(`📊 ${info} [MANAGE OPS]`);
    else if (u.role === "staff") console.log(`👥 ${info} [VIEW & CREATE]`);
    else if (u.role === "delivery-partner") console.log(`🚚 ${info} [DELIVER ORDERS]`);
  });
  console.log("─".repeat(60));

  console.log("\n📊 DEMO DATA CREATED:");
  console.log(`  • Roles: ${DEFAULT_ROLES.length}`);
  console.log(`  • Users: ${demoUsers.length}`);
  console.log(`  • Warehouses: ${warehouseCodes.length}`);
  console.log(`  • Products: ${Object.keys(productDocs).length}`);
  console.log(`  • Warehouse Stock Records: ${Object.keys(productDocs).length * warehouseCodes.length}`);
  console.log(`  • Sample Orders: 4 (showing full workflow)\n`);

  console.log("🔄 ORDER WORKFLOW VISIBLE IN SYSTEM:");
  console.log("─".repeat(60));
  console.log("  SO-PENDING-001    → PENDING      (Customer ordered, waiting approval)");
  console.log("  SO-PROCESSING-001 → PROCESSING   (In warehouse, ready to ship)");
  console.log("  SO-INTRANSIT-001  → IN TRANSIT   (Delivery partner has it)");
  console.log("  SO-DELIVERED-001  → COMPLETED    (Successfully delivered)\n");

  console.log("✨ USER ROLES & CAPABILITIES:");
  console.log("─".repeat(60));
  console.log("  👤 CUSTOMER (customer@godown.com)");
  console.log("     → View products, place orders, track orders\n");

  console.log("  👑 ADMIN (admin@godown.com)");
  console.log("     → Full system access, approve orders, manage all users\n");

  console.log("  📊 MANAGER (manager@godown.com)");
  console.log("     → Manage operations, warehouses, approve orders\n");

  console.log("  👥 STAFF (staff@godown.com)");
  console.log("     → View & create orders, manage inventory\n");

  console.log("  🚚 DELIVERY PARTNER (delivery@godown.com)");
  console.log("     → View assigned orders, update delivery status\n");

  console.log("✨ NEXT STEPS:");
  console.log("  1. Run: npm run dev");
  console.log("  2. Click demo credentials to copy email");
  console.log("  3. Paste email & use password: demo@2026");
  console.log("  4. Explore role-specific dashboards\n");

  await mongoose.disconnect();
}

seed().catch(console.error);
