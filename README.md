# Godown ERP

A production-grade **ERP-lite** system built with **Next.js 14**, featuring dynamic RBAC, multi-tenancy, SAP-inspired procurement workflows, AI-powered inventory predictions, real-time WebSocket events, and comprehensive analytics dashboards.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Folder Structure](#folder-structure)
- [Database Design (ER Diagram)](#database-design-er-diagram)
- [Dynamic RBAC System](#dynamic-rbac-system)
- [SAP-Inspired PO Workflow](#sap-inspired-po-workflow)
- [AI Design – Inventory Restocking Prediction](#ai-design--inventory-restocking-prediction)
- [Real-Time WebSocket Architecture](#real-time-websocket-architecture)
- [Security Implementation](#security-implementation)
- [Multi-Tenancy Strategy](#multi-tenancy-strategy)
- [Scalability Strategy](#scalability-strategy)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Seed Data](#seed-data)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  Next.js App Router │ ShadCN UI │ Recharts │ Zustand │ WS   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                   Next.js 14 Server                          │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ NextAuth │ │ API Routes │ │Middleware│ │ Edge Runtime  │ │
│  │  (JWT)   │ │   (CRUD)   │ │  (RBAC) │ │  (Security)  │ │
│  └──────────┘ └────────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Services │ │ Socket.io  │ │  OpenAI  │ │   AWS S3     │ │
│  │ (Logic)  │ │ (Realtime) │ │ (GPT-4o) │ │  (Uploads)   │ │
│  └──────────┘ └────────────┘ └──────────┘ └──────────────┘ │
└─────┬──────────────┬──────────────┬─────────────────────────┘
      │              │              │
┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐
│ PostgreSQL │  │   Redis   │  │ AWS S3  │
│  (Prisma)  │  │  (Cache)  │  │ (Files) │
└────────────┘  └───────────┘  └─────────┘
```

---

## Tech Stack

| Layer          | Technology                                    |
|----------------|----------------------------------------------|
| **Framework**  | Next.js 14 (App Router)                       |
| **Language**   | TypeScript (strict)                            |
| **Database**   | PostgreSQL + Prisma ORM                        |
| **Cache**      | Redis (ioredis)                                |
| **Auth**       | NextAuth v4 (JWT strategy, 15-min expiry)     |
| **UI**         | Tailwind CSS + ShadCN UI + Radix Primitives    |
| **Charts**     | Recharts (Line, Bar, Pie, Area)                |
| **State**      | Zustand (notifications, sidebar)               |
| **Realtime**   | Socket.io + Redis Adapter                      |
| **AI**         | OpenAI GPT-4o (structured output)              |
| **Storage**    | AWS S3 (presigned URLs)                        |
| **Validation** | Zod schemas                                    |

---

## Features

### Core Modules
- **Vendor Management** – CRUD with status tracking (Active/Inactive/Suspended/Blacklisted)
- **Product Management** – Full inventory with SKU, stock levels, low-stock alerts
- **Service Management** – Multiple pricing models (Fixed/Hourly/Per Unit/Subscription)
- **Consumer Management** – Customer database with duplicate detection
- **Order Management** – Product & service orders with lifecycle tracking
- **Purchase Orders** – SAP-inspired approval workflow with separation of duties

### Analytics & AI
- **Dashboard** – Summary cards, weekly trends, revenue breakdown
- **Analytics** – Vendor performance, margin analysis, consumer growth
- **AI Predictions** – OpenAI GPT-4o inventory restocking predictions

### Platform
- **Dynamic RBAC** – No hardcoded roles; fully configurable permissions
- **Multi-Tenancy** – Complete tenant isolation at the database level
- **Real-Time Events** – WebSocket notifications for inventory, orders, POs
- **File Uploads** – AWS S3 with presigned URLs and type validation
- **Security** – JWT auth, rate limiting, security headers, input sanitization

---

## Folder Structure

```
Godown/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   ├── register/page.tsx       # Registration page
│   │   └── layout.tsx              # Auth layout (centered)
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Dashboard home
│   │   │   ├── vendors/page.tsx    # Vendor management
│   │   │   ├── products/page.tsx   # Product management
│   │   │   ├── services/page.tsx   # Service management
│   │   │   ├── consumers/page.tsx  # Consumer management
│   │   │   ├── orders/page.tsx     # Order management
│   │   │   ├── purchase-orders/page.tsx  # PO workflow
│   │   │   └── analytics/page.tsx  # Analytics + AI
│   │   └── layout.tsx              # Dashboard layout (sidebar)
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth handler
│   │   ├── auth/register/          # User registration
│   │   ├── vendors/                # Vendor CRUD API
│   │   ├── products/               # Product CRUD API
│   │   ├── services/               # Service CRUD API
│   │   ├── consumers/              # Consumer CRUD API
│   │   ├── orders/                 # Order API
│   │   ├── purchase-orders/        # PO workflow API
│   │   ├── analytics/              # Analytics API
│   │   ├── ai/predict-restock/     # AI prediction API
│   │   └── upload/                 # File upload API
│   ├── globals.css
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Root redirect
├── components/
│   ├── dashboard/sidebar.tsx       # Sidebar + TopBar
│   ├── providers.tsx               # Session provider
│   └── ui/                         # ShadCN UI components
│       ├── badge.tsx, button.tsx, card.tsx, dialog.tsx
│       ├── dropdown-menu.tsx, input.tsx, label.tsx
│       ├── select.tsx, separator.tsx, skeleton.tsx
│       ├── table.tsx, tabs.tsx, textarea.tsx, tooltip.tsx
├── lib/
│   ├── auth.ts                     # NextAuth configuration
│   ├── prisma.ts                   # Prisma client singleton
│   ├── redis.ts                    # Redis client + cache helpers
│   ├── rbac.ts                     # Dynamic RBAC system
│   ├── s3.ts                       # AWS S3 helpers
│   ├── ai.ts                       # OpenAI integration
│   ├── socket.ts                   # Socket.io server
│   ├── utils.ts                    # Utility functions
│   ├── zod-schemas.ts              # Validation schemas
│   └── middleware/
│       ├── auth.ts                 # Auth middleware wrapper
│       └── permission.ts           # Permission check middleware
├── modules/
│   ├── vendor/service.ts           # Vendor business logic
│   ├── product/service.ts          # Product business logic
│   ├── service/service.ts          # Service business logic
│   ├── consumer/service.ts         # Consumer business logic
│   ├── order/service.ts            # Order business logic (transactions)
│   ├── purchase-order/service.ts   # PO workflow logic
│   └── analytics/service.ts        # Analytics aggregation
├── stores/
│   ├── notification-store.ts       # Notification state (Zustand)
│   └── sidebar-store.ts           # Sidebar state (Zustand)
├── prisma/
│   ├── schema.prisma               # Database schema (16 models)
│   └── seed.ts                     # Seed script
├── middleware.ts                    # Next.js edge middleware
├── next.config.mjs                 # Security headers
└── .env.example                    # Environment template
```

---

## Database Design (ER Diagram)

```
┌──────────┐     ┌──────────┐     ┌─────────────┐
│  Tenant  │────<│   User   │────<│  UserRole   │
└──────────┘     └──────────┘     └──────┬──────┘
     │                                    │
     │           ┌──────────┐     ┌──────▼──────┐     ┌────────────────┐
     │           │Permission│────<│RolePermission│────>│      Role      │
     │           └──────────┘     └─────────────┘     └────────────────┘
     │
     ├───<┌──────────┐     ┌──────────────┐
     │    │  Vendor  │────<│   Product    │
     │    └──────────┘     └──────┬───────┘
     │         │                   │
     │         │    ┌──────────┐   │    ┌─────────────┐
     │         └───<│ Service  │   ├───<│ OrderItem   │
     │              └──────────┘   │    └──────┬──────┘
     │                             │           │
     ├───<┌──────────┐     ┌──────▼───┐        │
     │    │ Consumer │────<│  Order   │<───────┘
     │    └──────────┘     └──────────┘
     │
     ├───<┌──────────────┐     ┌──────────────────┐
     │    │PurchaseOrder │────<│PurchaseOrderItem  │
     │    └──────────────┘     └──────────────────┘
     │
     ├───<┌──────────────┐
     │    │ SalesHistory │  (for AI analytics)
     │    └──────────────┘
     │
     └───<┌──────────────┐
          │ AiPrediction │  (cached predictions)
          └──────────────┘
```

**16 Models**: Tenant, User, Role, Permission, RolePermission, UserRole, RefreshToken, Vendor, Product, Service, Consumer, Order, OrderItem, PurchaseOrder, PurchaseOrderItem, SalesHistory, AiPrediction

---

## Dynamic RBAC System

### Design Principles
- **Zero hardcoded roles** – All roles created dynamically per tenant
- **Permission-based** – API checks permissions, not role names
- **Cached** – Permissions cached in Redis (5-min TTL) for performance
- **Tenant-isolated** – Each tenant defines their own roles

### Permission Format
```
{resource}:{action}
```
Examples: `vendor:create`, `product:read`, `purchase-order:approve`, `ai:predict`

### How It Works

```
User Request → Auth Middleware → Permission Middleware → API Handler
                    │                    │
                    ▼                    ▼
              Verify JWT          Check Redis Cache
              Extract userId      ├── Cache HIT → permissions[]
              Extract tenantId    └── Cache MISS → DB Query → Cache → permissions[]
                                         │
                                         ▼
                                  Has required permission?
                                  ├── YES → Execute handler
                                  └── NO → 403 Forbidden
```

### Default Roles (created by seed)
| Role    | Permissions                                 |
|---------|---------------------------------------------|
| Admin   | All 28 permissions                          |
| Manager | All except `user:manage`                    |
| Clerk   | All `:read` and `:create` permissions       |

---

## SAP-Inspired PO Workflow

### Research Background

SAP's procurement workflow (ME21N → ME29N → MIGO) enforces:
1. **Separation of Duties** – Creator cannot approve their own PO
2. **Sequential Approval** – Clear status transitions
3. **Automatic Stock Update** – Goods receipt updates inventory
4. **Audit Trail** – Full tracking of who did what and when

### Implementation

```
  CREATE (PENDING)
       │
       ▼
  ┌─────────────┐     ┌────────────────┐
  │   PENDING   │────>│   APPROVED     │────> FULFILLED
  │             │     │ (auto-restock) │     (goods received)
  └──────┬──────┘     └────────────────┘
         │
         └──────────> REJECTED (with reason)
```

**Key Rules:**
- Creator ≠ Approver (separation of duties enforced in code)
- Approval auto-increments product stock quantities
- Fulfillment marks the PO as goods received
- All transitions emit WebSocket events
- Full audit trail with `createdById` and `approvedById`

---

## AI Design – Inventory Restocking Prediction

### Overview
Uses **OpenAI GPT-4o** with structured output (Zod schema) to analyze sales patterns and recommend optimal restocking quantities.

### How It Works

```
1. Fetch sales history (configurable days window, default 30)
2. Calculate moving averages (7-day, 14-day, 30-day)
3. Get current stock levels and min thresholds
4. Sanitize data (remove PII, limit context size)
5. Send to GPT-4o with structured output schema
6. Validate response against Zod schema
7. Cache prediction in database
8. Return to client
```

### Prompt Engineering
- **System prompt**: Defines role as supply chain analyst
- **Data context**: Product name, current stock, min level, moving averages, trend direction
- **Output schema**: Enforced via Zod → `productName`, `currentStock`, `recommendedOrder`, `urgency` (HIGH/MEDIUM/LOW), `reasoning`, `predictedDemand`, `confidenceScore`

### Security Measures
- Input sanitization (no user-controlled text in prompts)
- Rate limiting (5 requests/minute per user)
- Response validation (Zod parsing)
- Cost control (limited token context)

---

## Real-Time WebSocket Architecture

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Client A │◄───►│  Socket.io   │◄───►│ Client B │
│ (Tenant1)│     │   Server     │     │ (Tenant1)│
└──────────┘     │   ┌──────┐   │     └──────────┘
                 │   │Redis │   │
                 │   │Adapter│  │
                 │   └──────┘   │
                 └──────────────┘
```

### Events
| Event              | Trigger                           |
|--------------------|------------------------------------|
| `inventory:update` | Product stock change               |
| `order:new`        | New order created                  |
| `order:status`     | Order status changed               |
| `po:status`        | Purchase order approved/rejected    |

### Tenant Isolation
- Each tenant joins room `tenant:{tenantId}`
- Events only broadcast to the tenant's room
- Redis adapter enables horizontal scaling

---

## Security Implementation

### Layers
1. **Edge Middleware** – JWT validation, redirect unauthenticated, inject tenantId
2. **Security Headers** – X-Frame-Options, HSTS, CSP, X-Content-Type-Options
3. **Rate Limiting** – Redis-based per-endpoint limits
4. **Input Validation** – Zod schemas on all API inputs
5. **SQL Injection Prevention** – Prisma parameterized queries
6. **File Upload Validation** – MIME type + size checks (5MB max, PDF/PNG/JPG only)
7. **Password Hashing** – bcrypt with 12 salt rounds
8. **RBAC Enforcement** – Permission checks on every protected endpoint
9. **Tenant Isolation** – All queries filtered by tenantId

### Known Security Risks & Mitigations
| Risk                        | Mitigation                                    |
|-----------------------------|-----------------------------------------------|
| JWT token theft             | 15-min expiry, httpOnly cookies                |
| CSRF attacks                | SameSite cookies, origin validation            |
| XSS                         | React auto-escaping, CSP headers               |
| SQL injection               | Prisma ORM (parameterized queries)             |
| File upload attacks          | MIME validation, S3 presigned URLs             |
| Rate limit bypass            | Redis-based, per-IP + per-user limiting        |
| AI prompt injection          | Input sanitization, no user text in prompts    |
| Tenant data leakage          | tenantId filter on every DB query              |

---

## Multi-Tenancy Strategy

### Approach: Shared Database, Row-Level Isolation

Every model with tenant-sensitive data includes a `tenantId` foreign key. All service layer queries automatically filter by the authenticated user's `tenantId`.

```typescript
// Every query automatically scoped
const vendors = await prisma.vendor.findMany({
  where: { tenantId: user.tenantId, ...filters },
});
```

### Why This Approach?
- **Cost-efficient** – Single database instance
- **Simple ops** – No per-tenant database management
- **Prisma-native** – Natural WHERE clause filtering
- **Scalable** – Add index on tenantId for performance

### Trade-offs
- Requires discipline (every query must include tenantId)
- Cross-tenant queries need explicit bypass (admin only)
- Consider database-per-tenant for large enterprise clients

---

## Scalability Strategy

### Horizontal Scaling
```
Load Balancer
├── App Instance 1 ──┐
├── App Instance 2 ──┤──> Shared PostgreSQL
├── App Instance 3 ──┤──> Shared Redis (Socket.io adapter)
└── App Instance N ──┘──> Shared S3
```

### Optimization Points
| Component    | Strategy                                          |
|-------------|---------------------------------------------------|
| Database    | Connection pooling (Prisma), read replicas         |
| Cache       | Redis for sessions, RBAC, analytics (15-min TTL)  |
| WebSocket   | Redis adapter for multi-instance broadcasting      |
| API         | Rate limiting, pagination, cursor-based queries    |
| Frontend    | React Server Components, static generation where possible |
| Files       | S3 presigned URLs (no server bandwidth)            |
| AI          | Response caching in DB, rate limiting              |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- AWS S3 bucket (optional, for file uploads)
- OpenAI API key (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Godown

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database, Redis, and API credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Login Credentials (after seeding)

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Admin   | admin@godown.com    | password123  |
| Manager | manager@godown.com  | password123  |
| Clerk   | clerk@godown.com    | password123  |
| Beta Admin | admin@beta.com   | password123  |

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/godown?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"

# AWS S3
AWS_S3_BUCKET="godown-uploads"
AWS_S3_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"
```

---

## API Documentation

### Authentication
| Method | Endpoint              | Description        |
|--------|----------------------|---------------------|
| POST   | `/api/auth/register`  | Register new tenant + user |
| POST   | `/api/auth/[...nextauth]` | NextAuth sign-in  |

### Vendors
| Method | Endpoint               | Permission      |
|--------|------------------------|-----------------|
| GET    | `/api/vendors`         | `vendor:read`   |
| POST   | `/api/vendors`         | `vendor:create` |
| GET    | `/api/vendors/:id`     | `vendor:read`   |
| PUT    | `/api/vendors/:id`     | `vendor:update` |
| DELETE | `/api/vendors/:id`     | `vendor:delete` |

### Products
| Method | Endpoint                | Permission       |
|--------|------------------------|------------------|
| GET    | `/api/products`         | `product:read`   |
| POST   | `/api/products`         | `product:create` |
| GET    | `/api/products/:id`     | `product:read`   |
| PUT    | `/api/products/:id`     | `product:update` |
| DELETE | `/api/products/:id`     | `product:delete` |

### Services
| Method | Endpoint                | Permission       |
|--------|------------------------|------------------|
| GET    | `/api/services`         | `service:read`   |
| POST   | `/api/services`         | `service:create` |
| GET    | `/api/services/:id`     | `service:read`   |
| PUT    | `/api/services/:id`     | `service:update` |
| DELETE | `/api/services/:id`     | `service:delete` |

### Consumers
| Method | Endpoint                 | Permission        |
|--------|-------------------------|-------------------|
| GET    | `/api/consumers`         | `consumer:read`   |
| POST   | `/api/consumers`         | `consumer:create` |
| GET    | `/api/consumers/:id`     | `consumer:read`   |
| PUT    | `/api/consumers/:id`     | `consumer:update` |
| DELETE | `/api/consumers/:id`     | `consumer:delete` |

### Orders
| Method | Endpoint              | Permission      |
|--------|-----------------------|-----------------|
| GET    | `/api/orders`         | `order:read`    |
| POST   | `/api/orders`         | `order:create`  |
| GET    | `/api/orders/:id`     | `order:read`    |
| PUT    | `/api/orders/:id`     | `order:update`  |

### Purchase Orders
| Method | Endpoint                     | Permission                |
|--------|------------------------------|---------------------------|
| GET    | `/api/purchase-orders`       | `purchase-order:read`     |
| POST   | `/api/purchase-orders`       | `purchase-order:create`   |
| GET    | `/api/purchase-orders/:id`   | `purchase-order:read`     |
| PUT    | `/api/purchase-orders/:id`   | `purchase-order:approve`  |

### Analytics
| Method | Endpoint                          | Permission       |
|--------|-----------------------------------|------------------|
| GET    | `/api/analytics?type=summary`     | `analytics:read` |
| GET    | `/api/analytics?type=weekly-trend` | `analytics:read` |
| GET    | `/api/analytics?type=revenue-by-type` | `analytics:read` |
| GET    | `/api/analytics?type=vendor-performance` | `analytics:read` |
| GET    | `/api/analytics?type=consumer-growth` | `analytics:read` |
| GET    | `/api/analytics?type=margin-analysis` | `analytics:read` |

### AI
| Method | Endpoint                    | Permission    |
|--------|-----------------------------|---------------|
| POST   | `/api/ai/predict-restock`   | `ai:predict`  |

### Upload
| Method | Endpoint       | Permission      |
|--------|---------------|-----------------|
| POST   | `/api/upload`  | `upload:create` |
| GET    | `/api/upload`  | `upload:create` |

---

## Seed Data

The seed script creates:
- **2 tenants**: Acme Corporation, Beta Industries
- **4 users**: Admin, Manager, Clerk (Acme), Admin (Beta)
- **28 permissions**: Full CRUD + special actions
- **4 roles**: Admin, Manager, Clerk (Acme), Admin (Beta)
- **20 vendors**: Various statuses (Active, Inactive, Suspended, Blacklisted)
- **50 products**: With SKUs, pricing, stock levels
- **10 services**: Multiple pricing models
- **30 consumers**: With contact details
- **100 orders**: Mixed product/service orders over 90 days
- **90 days sales history**: For AI analysis
- **15 purchase orders**: Various workflow states
- **5 AI predictions**: Sample cached predictions

---

## License

MIT
