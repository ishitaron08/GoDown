# GoDown Inventory Management - Project Memory

## Current Session: Complete Demo Setup & Functional Workflow

### Login Page Updates (Latest)
- **Changed from autofill to copy-only**: Click credentials button now ONLY copies email to clipboard
- Removed auto-fill of password field
- Users must manually paste email and enter password `demo@2026`
- Copy state shows Check icon for 2 seconds after clicking

### Enhanced Seed Script - Complete Functional Demo

**5 Demo Users** (Password: `demo@2026`)
1. `admin@godown.com` → Admin (approve orders, manage all)
2. `manager@godown.com` → Manager (manage operations)
3. `staff@godown.com` → Staff (view & create)
4. `customer@godown.com` → Customer (place orders)
5. `delivery@godown.com` → Delivery Partner (deliver orders)

**3 Warehouses (Godowns)**
- GD-MUM: Central Warehouse (Mumbai)
- GD-DEL: North Godown (Delhi)
- GD-KOL: East Storage (Kolkata)

**6 Products** with inventory (100-500 units per warehouse)
- Industrial Bearings (₹150/pcs)
- Steel Rods (₹80/kg)
- Electronic Components (₹200/pcs)
- Packaging Boxes (₹10/boxes)
- Chemical Solvent (₹350/liters)
- Power Drill Tool (₹450/pcs)

**4 Sample Demo Orders** showing complete workflow:
```
SO-PENDING-001    → PENDING      (Customer ordered, waiting admin approval)
SO-PROCESSING-001 → PROCESSING   (Approved, in warehouse picking)
SO-INTRANSIT-001  → IN TRANSIT   (Assigned to delivery partner)
SO-DELIVERED-001  → COMPLETED    (Successfully delivered)
```

**18 Warehouse Stock Records** (6 products × 3 warehouses)

### Order Workflow Architecture
```
Customer Login
    ↓
Browse Products (from multiple warehouses)
    ↓
Place Order (creates SO with status: pending)
    ↓
Admin aproves (or rejects)
    ↓
Assigned to nearest warehouse (status: processing)
    ↓
Warehouse staff picks & packs
    ↓
Assigned to delivery partner (deliveryStatus: in_transit)
    ↓
Delivery partner updates as in transit
    ↓
Delivered (status: completed)
```

### Database Interconnections
- **Orders** reference: Customer (User), Products, Warehouse, Delivery Partner
- **Warehouse Stock** tracks: Quantity per Product per Warehouse
- **Users** have Roles determining permissions
- **Products** belong to Categories
- **Orders** show complete lifecycle visible to different roles

### Role-Based Dashboard Views (Functional)
- **👤 Customer**: Browse products, place orders, track their orders
- **👑 Admin**: View all orders, approve/process, manage system
- **📊 Manager**: Manage operations, warehouses, approve orders
- **👥 Staff**: View orders, create orders, manage inventory
- **🚚 Delivery Partner**: View assigned orders, update delivery status

---

## Demo Credentials Setup (Previous Sessions)

### Created 5 Test Accounts
All accounts use password: **`demo@2026`**

### Seed Script Output
```bash
npm run seed
```
Creates all accounts, warehouses, products, inventory, and sample orders with formatted display

---

## Authentication & Database-Only Login

### Registration Disabled
- New users cannot self-register
- Only admins can create accounts
- All login attempts validated against database

### Login Security
- Email copied from credentials panel (not autofilled)
- Manual password entry required
- Session validated through NextAuth.js
- JWT token stored in secure cookies

---

## AI Chatbot Security Implementation

**New Security Library:** `src/lib/ai-security.ts`
- Prompt injection detection (30+ keywords)
- Input sanitization (remove control chars, 2000 char limit)
- Output filtering (remove system prompts)
- Jailbreak attempt detection
- Audit logging for security events

**API Protections:**
- Role-based access (Admin/Manager only)
- Input validation before processing
- Output filtering after response
- Generic error messages
- Security logging

---

## UI/Mobile Optimization

### Desktop Layout
- Dashboard on one page (no unnecessary scroll)
- Sidebar with internal scrolling only
- Chart heights optimized (150px desktop, 110px mobile)
- Responsive spacing (`space-y-4`)

### Mobile Responsiveness
- Hamburger menu drawer
- Responsive padding with `md:` breakpoints
- Full-width on mobile, side-by-side on desktop
- Credentials drawer at bottom

---

## Technical Stack

- **Frontend:** Next.js 14.2, React 18, TailwindCSS
- **Backend:** Next.js API routes, MongoDB, Mongoose
- **Auth:** NextAuth.js with JWT
- **AI:** OpenRouter (Mistral)
- **Database Models:** User, Role, Product, Category, Warehouse, WarehouseStock, Order, Supplier, StockMovement, InventoryLog

---

## Key Files

- `src/app/auth/login/page.tsx` - Copy credentials (not autofill)
- `src/scripts/seed.ts` - Enhanced with products, warehouses, orders
- `src/lib/ai-security.ts` - Security protections
- `src/models/` - All database schemas
- `/api/auth/register/route.ts` - Disabled (403 error)

---

## Memory Notes

- Seed script creates interconnected demo data showing real order workflow
- Each role has specific permissions and dashboard views
- Copy buttons for credentials (no autofill)
- Complete functional demo for testing and inspection
