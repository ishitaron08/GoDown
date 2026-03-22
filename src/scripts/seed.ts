import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.DATABASE_URL!;
const DEMO_PASSWORD = "demo@2026";

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Import models (without @refernces for simplicity in this script)
    const db = mongoose.connection.db!;

    // Drop collections for clean seed
    const collectionsToCheck = ["roles", "users", "categories", "warehouses", "products", "warehousestocks", "orders"];
    for (const colName of collectionsToCheck) {
      try {
        await db.collection(colName).deleteMany({});
      } catch (e) {
        // Collection might not exist yet
      }
    }

    // Define schemas locally for this seed script
    const RoleSchema = new mongoose.Schema({
      name: String,
      slug: { type: String, unique: true, lowercase: true },
      description: String,
      permissions: [String],
      isSystem: { type: Boolean, default: false },
      isDefault: { type: Boolean, default: false },
    }, { timestamps: true });

    const UserSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true, lowercase: true },
      password: String,
      role: String,
      avatar: String,
      assignedWarehouse: mongoose.Schema.Types.ObjectId,
      isActive: { type: Boolean, default: true },
    }, { timestamps: true });

    const WarehouseSchema = new mongoose.Schema({
      name: String,
      code: { type: String, unique: true, uppercase: true },
      address: String,
      city: String,
      pincode: String,
      coordinates: { lat: Number, lng: Number },
      manager: mongoose.Schema.Types.ObjectId,
      deliveryPartners: [mongoose.Schema.Types.ObjectId],
      phone: String,
      isActive: { type: Boolean, default: true },
    }, { timestamps: true });

    const CategorySchema = new mongoose.Schema({
      name: String,
      slug: String,
    }, { timestamps: true });

    const ProductSchema = new mongoose.Schema({
      name: String,
      sku: String,
      category: mongoose.Schema.Types.ObjectId,
      price: Number,
      unit: String,
      description: String,
      stock: Number,
      isActive: { type: Boolean, default: true },
    }, { timestamps: true });

    const WarehouseStockSchema = new mongoose.Schema({
      product: mongoose.Schema.Types.ObjectId,
      warehouse: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      reorderLevel: Number,
    }, { timestamps: true });

    const OrderSchema = new mongoose.Schema({
      orderNumber: { type: String, unique: true },
      type: String,
      status: { type: String, default: "pending" },
      items: [{
        product: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,
      }],
      totalAmount: Number,
      createdBy: mongoose.Schema.Types.ObjectId,
      warehouse: mongoose.Schema.Types.ObjectId,
      deliveryPartner: mongoose.Schema.Types.ObjectId,
      deliveryStatus: { type: String, default: "unassigned" },
      customerName: String,
      customerPhone: String,
      customerAddress: String,
      customerPincode: String,
      deliveryAddress: String,
      estimatedDelivery: Date,
      actualDelivery: Date,
    }, { timestamps: true });

    const Role = mongoose.model("Role", RoleSchema);
    const User = mongoose.model("User", UserSchema);
    const Warehouse = mongoose.model("Warehouse", WarehouseSchema);
    const Category = mongoose.model("Category", CategorySchema);
    const Product = mongoose.model("Product", ProductSchema);
    const WarehouseStock = mongoose.model("WarehouseStock", WarehouseStockSchema);
    const Order = mongoose.model("Order", OrderSchema);

    console.log("═══════════════════════════════════════════════════════");
    console.log("         SEEDING DEMO DATA FOR GODOWN");
    console.log("═══════════════════════════════════════════════════════\n");

    // 1. Create Roles (from permissions.ts)
    const roleDefinitions = [
      {
        name: "Admin",
        slug: "admin",
        description: "Full system access",
        permissions: [
          "dashboard:view", "products:view", "products:create", "products:edit", "products:delete",
          "inventory:view", "inventory:create", "inventory:edit",
          "orders:view", "orders:create", "orders:edit", "orders:delete",
          "deliveries:view", "deliveries:edit",
          "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
          "categories:view", "categories:create", "categories:edit", "categories:delete",
          "reports:view", "reports:export", "ai:view", "ai:use",
          "users:view", "users:create", "users:edit", "users:delete",
          "roles:view", "roles:create", "roles:edit", "roles:delete",
          "settings:view", "settings:edit", "upload:create",
          "warehouses:view", "warehouses:create", "warehouses:edit", "warehouses:delete", "warehouses:stock",
        ],
      },
      {
        name: "Manager",
        slug: "manager",
        description: "Manage operations",
        permissions: [
          "dashboard:view", "products:view", "products:create", "products:edit",
          "inventory:view", "inventory:create", "inventory:edit",
          "orders:view", "orders:create", "orders:edit",
          "deliveries:view", "deliveries:edit",
          "suppliers:view", "suppliers:create", "suppliers:edit",
          "reports:view", "ai:view", "upload:create",
          "users:view", "users:edit", "settings:view",
          "warehouses:view", "warehouses:edit", "warehouses:stock",
        ],
      },
      {
        name: "Staff",
        slug: "staff",
        description: "Day-to-day operations",
        permissions: [
          "dashboard:view", "products:view", "products:create",
          "inventory:view", "inventory:create",
          "orders:view", "orders:create",
          "suppliers:view", "reports:view", "ai:view", "upload:create",
          "warehouses:view",
        ],
      },
      {
        name: "Customer",
        slug: "customer",
        description: "Browse products and place orders",
        permissions: ["products:view", "orders:view", "orders:create"],
      },
      {
        name: "Delivery Partner",
        slug: "delivery-partner",
        description: "Manage deliveries",
        permissions: [
          "dashboard:view", "deliveries:view", "deliveries:edit",
          "suppliers:view", "warehouses:view",
        ],
      },
    ];

    for (const roleDef of roleDefinitions) {
      await Role.create(roleDef);
    }
    console.log(`✓ Created ${roleDefinitions.length} roles\n`);

    // 2. Create Demo Users
    const demoPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
    const demoUsers = [
      { name: "Admin User", email: "admin@godown.com", role: "admin" },
      { name: "Manager User", email: "manager@godown.com", role: "manager" },
      { name: "Staff User", email: "staff@godown.com", role: "staff" },
      { name: "Customer User", email: "customer@godown.com", role: "customer" },
      { name: "Delivery Partner", email: "delivery@godown.com", role: "delivery-partner" },
    ];

    const createdUsers = await Promise.all(
      demoUsers.map(u => User.create({ ...u, password: demoPassword, isActive: true }))
    );
    console.log(`✓ Created ${createdUsers.length} demo users (password: ${DEMO_PASSWORD})\n`);

    // 3. Create Categories
    const categories = ["Electronics", "Raw Materials", "Hardware", "Chemicals", "Packaging", "Tools"];
    const categoryDocs = await Promise.all(
      categories.map(name => Category.create({ name, slug: name.toLowerCase() }))
    );
    console.log(`✓ Created ${categoryDocs.length} categories\n`);

    // 4. Create Warehouses
    const manager = createdUsers.find(u => u.role === "manager");
    const deliveryPartner = createdUsers.find(u => u.role === "delivery-partner");

    const warehouseDocs = await Promise.all([
      Warehouse.create({
        name: "Mumbai Hub",
        code: "GD-MUM",
        address: "123 Main St, Mumbai",
        city: "Mumbai",
        pincode: "400001",
        coordinates: { lat: 19.0760, lng: 72.8777 },
        manager: manager!._id,
        deliveryPartners: [deliveryPartner!._id],
        phone: "9876543210",
        isActive: true,
      }),
      Warehouse.create({
        name: "Delhi Hub",
        code: "GD-DEL",
        address: "456 Delhi Rd, Delhi",
        city: "Delhi",
        pincode: "110001",
        coordinates: { lat: 28.7041, lng: 77.1025 },
        manager: manager!._id,
        phone: "9123456789",
        isActive: true,
      }),
      Warehouse.create({
        name: "Kolkata Hub",
        code: "GD-KOL",
        address: "789 Kolkata Ave, Kolkata",
        city: "Kolkata",
        pincode: "700001",
        coordinates: { lat: 22.5726, lng: 88.3639 },
        manager: manager!._id,
        phone: "8888888888",
        isActive: true,
      }),
    ]);
    console.log(`✓ Created ${warehouseDocs.length} warehouses\n`);

    // Assign delivery partner to warehouse
    await User.findByIdAndUpdate(deliveryPartner!._id, {
      assignedWarehouse: warehouseDocs[0]._id,
    });

    // 5. Create Products
    const productDocs = await Promise.all([
      Product.create({
        name: "Laptop Pro",
        sku: "LAPTOP-001",
        category: categoryDocs[0]._id,
        price: 80000,
        unit: "piece",
        description: "High-performance laptop",
        stock: 50,
        isActive: true,
      }),
      Product.create({
        name: "Steel Rods",
        sku: "STEEL-001",
        category: categoryDocs[1]._id,
        price: 500,
        unit: "kg",
        description: "Construction steel rods",
        stock: 1000,
        isActive: true,
      }),
      Product.create({
        name: "Hammer Set",
        sku: "HAMMER-001",
        category: categoryDocs[2]._id,
        price: 1200,
        unit: "set",
        description: "Professional hammer set",
        stock: 100,
        isActive: true,
      }),
      Product.create({
        name: "Paint Can",
        sku: "PAINT-001",
        category: categoryDocs[3]._id,
        price: 800,
        unit: "liter",
        description: "Premium paint",
        stock: 200,
        isActive: true,
      }),
      Product.create({
        name: "Cardboard Box",
        sku: "BOX-001",
        category: categoryDocs[4]._id,
        price: 50,
        unit: "piece",
        description: "Shipping cardboard box",
        stock: 5000,
        isActive: true,
      }),
      Product.create({
        name: "Power Drill",
        sku: "DRILL-001",
        category: categoryDocs[5]._id,
        price: 3500,
        unit: "piece",
        description: "Electric power drill",
        stock: 30,
        isActive: true,
      }),
    ]);
    console.log(`✓ Created ${productDocs.length} products\n`);

    // 6. Create Warehouse Stock
    const stockRecords = [];
    for (const warehouse of warehouseDocs) {
      for (const product of productDocs) {
        stockRecords.push({
          product: product._id,
          warehouse: warehouse._id,
          quantity: Math.floor(Math.random() * 500) + 50,
          reorderLevel: 20,
        });
      }
    }
    await WarehouseStock.insertMany(stockRecords);
    console.log(`✓ Created ${stockRecords.length} warehouse stock records\n`);

    // 7. Create Demo Orders
    const customer = createdUsers.find(u => u.role === "customer");
    const orderDocs = await Promise.all([
      Order.create({
        orderNumber: "SO-PENDING-001",
        type: "outbound",
        status: "pending",
        items: [{
          product: productDocs[0]._id,
          quantity: 2,
          unitPrice: 80000,
          totalPrice: 160000,
        }],
        totalAmount: 160000,
        createdBy: customer!._id,
        warehouse: warehouseDocs[0]._id,
        customerName: "John Doe",
        customerPhone: "9876543210",
        customerAddress: "123 Customer St, Mumbai",
        customerPincode: "400001",
      }),
      Order.create({
        orderNumber: "SO-PROCESSING-001",
        type: "outbound",
        status: "processing",
        items: [{
          product: productDocs[1]._id,
          quantity: 100,
          unitPrice: 500,
          totalPrice: 50000,
        }],
        totalAmount: 50000,
        createdBy: customer!._id,
        warehouse: warehouseDocs[0]._id,
        deliveryPartner: deliveryPartner!._id,
        deliveryStatus: "assigned",
        customerName: "Jane Smith",
        customerPhone: "9123456789",
        customerAddress: "456 Delivery Ave, Mumbai",
        customerPincode: "400002",
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      }),
      Order.create({
        orderNumber: "SO-INTRANSIT-001",
        type: "outbound",
        status: "processing",
        items: [{
          product: productDocs[2]._id,
          quantity: 5,
          unitPrice: 1200,
          totalPrice: 6000,
        }],
        totalAmount: 6000,
        createdBy: customer!._id,
        warehouse: warehouseDocs[0]._id,
        deliveryPartner: deliveryPartner!._id,
        deliveryStatus: "in_transit",
        customerName: "Mike Johnson",
        customerPhone: "8888888888",
        customerAddress: "789 Express Ln, Mumbai",
        customerPincode: "400003",
        estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      }),
      Order.create({
        orderNumber: "SO-DELIVERED-001",
        type: "outbound",
        status: "completed",
        items: [{
          product: productDocs[4]._id,
          quantity: 1000,
          unitPrice: 50,
          totalPrice: 50000,
        }],
        totalAmount: 50000,
        createdBy: customer!._id,
        warehouse: warehouseDocs[0]._id,
        deliveryPartner: deliveryPartner!._id,
        deliveryStatus: "delivered",
        customerName: "Sarah Williams",
        customerPhone: "9999999999",
        customerAddress: "321 Success St, Mumbai",
        customerPincode: "400004",
        actualDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      }),
    ]);
    console.log(`✓ Created ${orderDocs.length} sample orders\n`);

    console.log("═══════════════════════════════════════════════════════");
    console.log("  ✨ SEED COMPLETE - DEMO DATA READY FOR INSPECTION");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("📖 DEMO CREDENTIALS (Password: " + DEMO_PASSWORD + "):");
    console.log("────────────────────────────────────────────────────────");
    console.log("👑 admin@godown.com          → admin             [APPROVE/PROCESS]");
    console.log("📊 manager@godown.com        → manager           [MANAGE OPS]");
    console.log("👥 staff@godown.com          → staff             [VIEW & CREATE]");
    console.log("👤 customer@godown.com       → customer          [PLACE ORDERS]");
    console.log("🚚 delivery@godown.com       → delivery-partner  [DELIVER ORDERS]");
    console.log("────────────────────────────────────────────────────────\n");

    console.log("📊 DEMO DATA CREATED:");
    console.log(`  • Roles: ${roleDefinitions.length}`);
    console.log(`  • Users: ${createdUsers.length}`);
    console.log(`  • Warehouses: ${warehouseDocs.length}`);
    console.log(`  • Products: ${productDocs.length}`);
    console.log(`  • Warehouse Stock Records: ${stockRecords.length}`);
    console.log(`  • Sample Orders: ${orderDocs.length} (showing full workflow)\n`);

    console.log("🔄 ORDER WORKFLOW VISIBLE IN SYSTEM:");
    console.log("────────────────────────────────────────────────────────");
    console.log("  SO-PENDING-001    → PENDING      (Customer ordered, waiting approval)");
    console.log("  SO-PROCESSING-001 → PROCESSING   (In warehouse, ready to ship)");
    console.log("  SO-INTRANSIT-001  → IN TRANSIT   (Delivery partner has it)");
    console.log("  SO-DELIVERED-001  → COMPLETED    (Successfully delivered)\n");

    console.log("✨ NEXT STEPS:");
    console.log("  1. Run: npm run dev");
    console.log("  2. Go to http://localhost:3000/auth/login");
    console.log("  3. Click demo credentials to copy email");
    console.log("  4. Paste email & use password: " + DEMO_PASSWORD);
    console.log("  5. Explore role-specific dashboards\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Seed error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
