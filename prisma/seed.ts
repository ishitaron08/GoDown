import { PrismaClient, VendorStatus, PricingModel, OrderType, OrderStatus, PurchaseOrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Tenant 1 ──────────────────────────────────────────────
  const tenant1 = await prisma.tenant.create({
    data: { name: "Acme Corporation", subdomain: "acme-corp" },
  });

  // ─── Tenant 2 ──────────────────────────────────────────────
  const tenant2 = await prisma.tenant.create({
    data: { name: "Beta Industries", subdomain: "beta-industries" },
  });

  console.log("✅ Created tenants");

  // ─── Permissions (shared) ──────────────────────────────────
  const permissionNames = [
    "vendor.view",
    "vendor.create",
    "vendor.update",
    "vendor.delete",
    "product.view",
    "product.create",
    "product.update",
    "product.delete",
    "service.view",
    "service.manage",
    "consumer.view",
    "consumer.create",
    "consumer.update",
    "order.view",
    "order.create",
    "po.view",
    "po.create",
    "po.approve",
    "analytics.view",
    "ai.predict",
    "file.upload",
    "user.manage",
  ];

  const permissions = await Promise.all(
    permissionNames.map((name) =>
      prisma.permission.create({
        data: {
          action: name,
          description: `Permission to ${name.replace(":", " ").replace("-", " ")}`,
        },
      })
    )
  );

  console.log(`✅ Created ${permissions.length} permissions`);

  // ─── Roles for Tenant 1 ───────────────────────────────────
  const adminRole = await prisma.role.create({
    data: {
      name: "Admin",
      description: "Full system access — Can manage users, roles, vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. This is the highest privilege role with unrestricted access to all features.",
      tenantId: tenant1.id,
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      name: "Manager",
      description: "Management access — Can view and manage vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. Cannot manage users or roles.",
      tenantId: tenant1.id,
    },
  });

  const clerkRole = await prisma.role.create({
    data: {
      name: "Clerk",
      description: "Basic data entry — Can view all resources and create consumers, orders, and purchase orders. Cannot update or delete vendors, products, or services. Cannot manage users.",
      tenantId: tenant1.id,
    },
  });

  const viewerRole = await prisma.role.create({
    data: {
      name: "Viewer",
      description: "Read-only access — Can view vendors, products, services, consumers, orders, purchase orders, and analytics. Cannot create, update, or delete any data.",
      tenantId: tenant1.id,
    },
  });

  // Admin gets all permissions
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({
      roleId: adminRole.id,
      permissionId: p.id,
    })),
  });

  // Manager gets most (not user.manage)
  const managerPerms = permissions.filter((p) => p.action !== "user.manage");
  await prisma.rolePermission.createMany({
    data: managerPerms.map((p) => ({
      roleId: managerRole.id,
      permissionId: p.id,
    })),
  });

  // Clerk gets view + create permissions
  const clerkPerms = permissions.filter(
    (p) => p.action.includes(".view") || p.action.includes(".create")
  );
  await prisma.rolePermission.createMany({
    data: clerkPerms.map((p) => ({
      roleId: clerkRole.id,
      permissionId: p.id,
    })),
  });

  // Viewer gets only view permissions
  const viewerPerms = permissions.filter((p) => p.action.includes(".view"));
  await prisma.rolePermission.createMany({
    data: viewerPerms.map((p) => ({
      roleId: viewerRole.id,
      permissionId: p.id,
    })),
  });

  // ─── Roles for Tenant 2 ───────────────────────────────────
  const t2AdminRole = await prisma.role.create({
    data: {
      name: "Admin",
      description: "Full system access — Can manage users, roles, vendors, products, services, consumers, orders, purchase orders, analytics, AI predictions, and file uploads. This is the highest privilege role with unrestricted access to all features.",
      tenantId: tenant2.id,
    },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({
      roleId: t2AdminRole.id,
      permissionId: p.id,
    })),
  });

  console.log("✅ Created roles with permissions");

  // ─── Users ────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@godown.com",
      password: hashedPassword,
      tenantId: tenant1.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Manager User",
      email: "manager@godown.com",
      password: hashedPassword,
      tenantId: tenant1.id,
    },
  });

  const clerk = await prisma.user.create({
    data: {
      name: "Clerk User",
      email: "clerk@godown.com",
      password: hashedPassword,
      tenantId: tenant1.id,
    },
  });

  const t2Admin = await prisma.user.create({
    data: {
      name: "Beta Admin",
      email: "admin@beta.com",
      password: hashedPassword,
      tenantId: tenant2.id,
    },
  });

  await prisma.userRole.createMany({
    data: [
      { userId: admin.id, roleId: adminRole.id },
      { userId: manager.id, roleId: managerRole.id },
      { userId: clerk.id, roleId: clerkRole.id },
      { userId: t2Admin.id, roleId: t2AdminRole.id },
    ],
  });

  console.log("✅ Created users with role assignments");

  // ─── Vendors (20 for Tenant 1) ────────────────────────────
  const vendorData = [
    { name: "TechParts Co.", email: "info@techparts.com", phone: "+1-555-0101", status: VendorStatus.ACTIVE },
    { name: "MetalWorks Inc.", email: "sales@metalworks.com", phone: "+1-555-0102", status: VendorStatus.ACTIVE },
    { name: "Global Supply Ltd.", email: "orders@globalsupply.com", phone: "+1-555-0103", status: VendorStatus.ACTIVE },
    { name: "Pacific Trading", email: "info@pacifictrading.com", phone: "+1-555-0104", status: VendorStatus.ACTIVE },
    { name: "Sunrise Electronics", email: "buy@sunriseelec.com", phone: "+1-555-0105", status: VendorStatus.ACTIVE },
    { name: "Green Materials", email: "eco@greenmaterials.com", phone: "+1-555-0106", status: VendorStatus.ACTIVE },
    { name: "QuickShip Logistics", email: "hello@quickship.com", phone: "+1-555-0107", status: VendorStatus.ACTIVE },
    { name: "Atlas Components", email: "parts@atlascomp.com", phone: "+1-555-0108", status: VendorStatus.ACTIVE },
    { name: "Nordic Supplies", email: "nordic@supplies.com", phone: "+1-555-0109", status: VendorStatus.ACTIVE },
    { name: "Prime Hardware", email: "sales@primehw.com", phone: "+1-555-0110", status: VendorStatus.ACTIVE },
    { name: "Swift Distribution", email: "swift@dist.com", phone: "+1-555-0111", status: VendorStatus.ACTIVE },
    { name: "Omega Parts", email: "orders@omegaparts.com", phone: "+1-555-0112", status: VendorStatus.ACTIVE },
    { name: "Central Warehouse", email: "cw@warehouse.com", phone: "+1-555-0113", status: VendorStatus.SUSPENDED },
    { name: "Eastern Materials", email: "east@materials.com", phone: "+1-555-0114", status: VendorStatus.ACTIVE },
    { name: "Precision Tools", email: "tools@precision.com", phone: "+1-555-0115", status: VendorStatus.ACTIVE },
    { name: "FutureTech", email: "info@futuretech.com", phone: "+1-555-0116", status: VendorStatus.ACTIVE },
    { name: "ValueParts Inc.", email: "value@parts.com", phone: "+1-555-0117", status: VendorStatus.SUSPENDED },
    { name: "MaxSupply Corp.", email: "max@supply.com", phone: "+1-555-0118", status: VendorStatus.ACTIVE },
    { name: "Titan Industries", email: "titan@ind.com", phone: "+1-555-0119", status: VendorStatus.ACTIVE },
    { name: "Legacy Systems", email: "legacy@systems.com", phone: "+1-555-0120", status: VendorStatus.SUSPENDED },
  ];

  const vendors = await Promise.all(
    vendorData.map((v) =>
      prisma.vendor.create({
        data: {
          ...v,
          address: `${Math.floor(Math.random() * 9999)} Industrial Ave, Suite ${Math.floor(Math.random() * 500)}`,
          tenantId: tenant1.id,
        },
      })
    )
  );

  console.log(`✅ Created ${vendors.length} vendors`);

  // ─── Products (50 for Tenant 1) ───────────────────────────
  const productNames = [
    "Aluminum Sheet 4x8", "Steel Bolt M10", "Copper Wire 14AWG", "PVC Pipe 2in", "Carbon Fiber Rod",
    "Rubber Gasket Set", "Stainless Flange", "Titanium Plate", "Brass Fitting 1/2", "Nylon Bearing",
    "LED Matrix Panel", "Power Inverter 500W", "Servo Motor 12V", "Capacitor 100uF", "Resistor Kit 1K",
    "Circuit Board PCB", "Thermal Paste", "Heat Sink Large", "USB-C Cable 3m", "Ethernet Switch 8P",
    "Hydraulic Pump", "Air Compressor Mini", "Pressure Gauge", "Flow Meter Digital", "Valve Actuator",
    "Safety Goggles", "Work Gloves Heavy", "Hard Hat Yellow", "Fire Extinguisher", "First Aid Kit Pro",
    "Drill Bit Set HSS", "Wrench Set Metric", "Screwdriver Kit", "Hex Key Set", "Tape Measure 25ft",
    "Welding Rod E7018", "Solder Wire 60/40", "Epoxy Adhesive", "Lubricant Spray", "Cleaning Solvent",
    "Warehouse Label Tape", "Packing Peanuts 5kg", "Bubble Wrap Roll", "Shrink Wrap Film", "Pallet Wrap",
    "Forklift Battery 48V", "Conveyor Belt 10m", "Pallet Jack", "Shelf Bracket Heavy", "Storage Bin Large",
  ];

  const products = await Promise.all(
    productNames.map((name, i) => {
      const costPrice = parseFloat((Math.random() * 200 + 5).toFixed(2));
      const margin = 1 + Math.random() * 0.8;
      return prisma.product.create({
        data: {
          name,
          sku: `SKU-${String(i + 1).padStart(4, "0")}`,
          description: `High quality ${name.toLowerCase()} for industrial use`,
          sellingPrice: parseFloat((costPrice * margin).toFixed(2)),
          costPrice,
          stockQuantity: Math.floor(Math.random() * 500) + 10,
          reorderThreshold: Math.floor(Math.random() * 30) + 5,
          vendorId: vendors[i % vendors.length].id,
          tenantId: tenant1.id,
        },
      });
    })
  );

  console.log(`✅ Created ${products.length} products`);

  // ─── Services (10) ────────────────────────────────────────
  const serviceData = [
    { name: "Equipment Installation", pricingModel: PricingModel.FIXED, basePrice: 500 },
    { name: "Maintenance Contract", pricingModel: PricingModel.SUBSCRIPTION, basePrice: 200 },
    { name: "Technical Consultation", pricingModel: PricingModel.HOURLY, basePrice: 150 },
    { name: "Quality Inspection", pricingModel: PricingModel.FIXED, basePrice: 25 },
    { name: "Calibration Service", pricingModel: PricingModel.FIXED, basePrice: 350 },
    { name: "Safety Audit", pricingModel: PricingModel.FIXED, basePrice: 1200 },
    { name: "Training Workshop", pricingModel: PricingModel.HOURLY, basePrice: 200 },
    { name: "Custom Fabrication", pricingModel: PricingModel.FIXED, basePrice: 75 },
    { name: "Shipping & Logistics", pricingModel: PricingModel.FIXED, basePrice: 15 },
    { name: "Warehouse Management", pricingModel: PricingModel.SUBSCRIPTION, basePrice: 800 },
  ];

  const services = await Promise.all(
    serviceData.map((s, i) =>
      prisma.service.create({
        data: {
          ...s,
          description: `Professional ${s.name.toLowerCase()} service`,
          availabilityStatus: true,
          vendorId: vendors[i % vendors.length].id,
          tenantId: tenant1.id,
        },
      })
    )
  );

  console.log(`✅ Created ${services.length} services`);

  // ─── Consumers (30) ──────────────────────────────────────
  const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

  const consumers = await Promise.all(
    firstNames.map((first, i) => {
      const last = lastNames[i];
      return prisma.consumer.create({
        data: {
          name: `${first} ${last}`,
          email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
          phone: `+1-555-${String(2000 + i).padStart(4, "0")}`,
          address: `${Math.floor(Math.random() * 9999)} Main St, City ${i + 1}`,
          tenantId: tenant1.id,
        },
      });
    })
  );

  console.log(`✅ Created ${consumers.length} consumers`);

  // ─── Orders (100) ─────────────────────────────────────────
  const statuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED];

  for (let i = 0; i < 100; i++) {
    const isProduct = Math.random() > 0.3;
    const consumer = consumers[Math.floor(Math.random() * consumers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const itemCount = Math.floor(Math.random() * 4) + 1;

    const orderItems = [];
    let totalAmount = 0;

    for (let j = 0; j < itemCount; j++) {
      if (isProduct) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 10) + 1;
        totalAmount += product.sellingPrice * qty;
        orderItems.push({
          productId: product.id,
          quantity: qty,
          unitPrice: product.sellingPrice,
        });
      } else {
        const service = services[Math.floor(Math.random() * services.length)];
        const qty = Math.floor(Math.random() * 5) + 1;
        totalAmount += service.basePrice * qty;
        orderItems.push({
          serviceId: service.id,
          quantity: qty,
          unitPrice: service.basePrice,
        });
      }
    }

    // Random date within past 90 days
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 90));

    await prisma.order.create({
      data: {
        type: isProduct ? OrderType.PRODUCT : OrderType.SERVICE,
        status,
        totalAmount,
        consumerId: consumer.id,
        tenantId: tenant1.id,
        createdAt,
        orderItems: {
          create: orderItems,
        },
      },
    });
  }

  console.log("✅ Created 100 orders");

  // ─── Sales History (90 days) ──────────────────────────────
  for (let day = 0; day < 90; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    const numSales = Math.floor(Math.random() * 8) + 2;
    for (let s = 0; s < numSales; s++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 20) + 1;
      await prisma.salesHistory.create({
        data: {
          productId: product.id,
          quantitySold: quantity,
          revenue: product.sellingPrice * quantity,
          date,
          tenantId: tenant1.id,
        },
      });
    }
  }

  console.log("✅ Created 90 days of sales history");

  // ─── Purchase Orders ──────────────────────────────────────
  const poStatuses = [
    PurchaseOrderStatus.PENDING,
    PurchaseOrderStatus.PENDING,
    PurchaseOrderStatus.APPROVED,
    PurchaseOrderStatus.APPROVED,
    PurchaseOrderStatus.FULFILLED,
    PurchaseOrderStatus.REJECTED,
  ];

  for (let i = 0; i < 15; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const vendorProducts = products.filter((p) => p.vendorId === vendor.id);
    if (vendorProducts.length === 0) continue;

    const poItems = [];
    let total = 0;
    const itemCount = Math.min(Math.floor(Math.random() * 3) + 1, vendorProducts.length);

    for (let j = 0; j < itemCount; j++) {
      const product = vendorProducts[j];
      const qty = Math.floor(Math.random() * 50) + 10;
      const unitPrice = product.costPrice;
      total += unitPrice * qty;
      poItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
      });
    }

    const status = poStatuses[Math.floor(Math.random() * poStatuses.length)];

    await prisma.purchaseOrder.create({
      data: {
        vendorId: vendor.id,
        createdById: admin.id,
        approvedById: status !== PurchaseOrderStatus.PENDING ? manager.id : null,
        status,
        totalAmount: total,
        notes: `PO for ${vendor.name} - Batch ${i + 1}`,
        tenantId: tenant1.id,
        items: {
          create: poItems,
        },
      },
    });
  }

  console.log("✅ Created 15 purchase orders");

  // ─── AI Predictions (sample) ──────────────────────────────
  for (let i = 0; i < 5; i++) {
    const product = products[i];
    await prisma.aiPrediction.create({
      data: {
        productId: product.id,
        daysUntilStockout: Math.floor(Math.random() * 200) + 50,
        recommendedQuantity: Math.floor(Math.random() * 100) + 20,
        confidence: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)),
        reasoning: `Based on ${Math.floor(Math.random() * 30 + 15)} days of sales data, showing ${Math.random() > 0.5 ? "increasing" : "steady"} demand trend.`,
        tenantId: tenant1.id,
      },
    });
  }

  console.log("✅ Created sample AI predictions");
  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Admin:   admin@godown.com / password123");
  console.log("  Manager: manager@godown.com / password123");
  console.log("  Clerk:   clerk@godown.com / password123");
  console.log("  Beta:    admin@beta.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
