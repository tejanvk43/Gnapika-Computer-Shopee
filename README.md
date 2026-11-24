# Multi-Branch Billing, Inventory & Service Management System

A production-ready, multi-tenant business management platform built with Next.js 14, Supabase, PostgreSQL, and TypeScript.

## 🚀 Features

- **Multi-Branch Architecture**: Centralized organization with independent branch inventory
- **POS Billing**: GST-compliant invoicing with CGST/SGST/IGST calculation
- **Inventory Management**: Real-time stock tracking, transfers, adjustments
- **Service Management**: Complete repair/service job lifecycle tracking
- **Barcode Scanning**: Camera-based and keyboard-wedge scanner support
- **Purchase Management**: Supplier management and stock receipt workflows
- **Reports & Analytics**: Sales, inventory, and financial reporting
- **Role-Based Access Control**: Owner, Admin, Branch Manager, Cashier, Technician, Accountant
- **Audit Logging**: Comprehensive activity tracking

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js Server Actions & API Routes
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth with Row Level Security (RLS)
- **Barcode**: jsbarcode (generation), @zxing/browser (scanning)
- **PDF**: PDFKit
- **Forms**: React Hook Form + Zod validation

## 📋 Prerequisites

- Node.js 18+
- Supabase Account (PostgreSQL + Auth + Storage)
- npm or yarn

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd billing-software
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NODE_ENV=development
PORT=3000
```

### 3. Database Setup

Apply migrations in order using Supabase CLI or SQL Editor:

```bash
# 1. Core Schema
supabase db push --file db/schema.sql

# 2. Atomic Invoice Function
supabase db push --file db/migrations/002_atomic_invoice_function.sql

# 3. Stock Helper Functions
supabase db push --file db/migrations/003_stock_functions.sql
```

### 4. Row Level Security (RLS)

Enable RLS on all tables and apply policies:

```sql
-- Example for customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers in their organization"
ON customers FOR SELECT USING (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);

-- Repeat for all organization-scoped tables
-- Add branch-scoped policies for branch_products, stock_movements, etc.
```

### 5. Initial Bootstrap

After database setup, run the one-time bootstrap to create the first organization and owner:

```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@company.com", "name": "Business Owner"}'
```

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🗂 Project Structure

```
billing-software/
├── app/
│   ├── api/                    # API Routes (Server Actions)
│   │   ├── auth/               # Authentication endpoints
│   │   ├── billing/            # Invoice creation, PDF
│   │   ├── customers/          # Customer CRUD
│   │   ├── products/           # Product & barcode management
│   │   ├── services/           # Service jobs & parts
│   │   ├── purchases/          # Supplier & purchase receipts
│   │   ├── inventory/          # Stock movements & transfers
│   │   ├── reports/            # Analytics endpoints
│   │   └── audit/              # Audit logging
│   ├── auth/                   # Auth pages (login, signup)
│   ├── dashboard/              # Protected dashboard routes
│   │   ├── customers/
│   │   ├── billing/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── services/
│   │   ├── purchases/
│   │   ├── reports/
│   │   └── settings/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing redirect
│   └── globals.css             # Global styles
├── components/                 # Reusable UI components
│   ├── BarcodeScanner.tsx
│   ├── theme-provider.tsx
│   └── ui/                     # shadcn/ui components
├── lib/                        # Core utilities
│   ├── supabase.ts             # Supabase clients (anon + service)
│   ├── auth.ts                 # Auth helpers
│   ├── initialSetup.ts         # Bootstrap logic
│   └── barcode.ts              # Barcode utilities
├── db/                         # Database schema & migrations
│   ├── schema.sql              # Core schema
│   └── migrations/
├── types/                      # TypeScript definitions
│   └── index.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── .env.example
```

## 🔐 Security Architecture

### Row Level Security (RLS)

All data access is controlled at the database level:

- **Organization Scope**: `organization_id` on all business tables
- **Branch Scope**: `branch_id` on inventory/transaction tables
- **User Context**: Derived from `auth.uid()` → `user_profiles` → `organization_memberships`/`branch_memberships`

### Role Hierarchy

| Role | Scope | Permissions |
|------|-------|-------------|
| **Owner** | Organization | Full access, user management, financial settings |
| **Admin** | Organization | Business ops, branches, users, reports |
| **Branch Manager** | Assigned Branches | Products, stock, billing, services, employees |
| **Cashier** | Assigned Branches | Create bills, search customers, receive payments |
| **Technician** | Assigned Branches | View/update service jobs, record parts |
| **Accountant** | Organization | View invoices, payments, financial reports |

### API Security

- All API routes validate `organization_id` and `branch_id` via `getCurrentUserContext()`
- Service role key **never** exposed to frontend
- Server-side calculation of all financial values (GST, totals)

## 📊 Database Schema

### Core Tables

| Table | Purpose | Scope |
|-------|---------|-------|
| `organizations` | Top-level tenant | Global |
| `branches` | Physical locations | Organization |
| `user_profiles` | User details | Organization |
| `organization_memberships` | Org roles | Organization |
| `branch_memberships` | Branch roles | Branch |
| `customers` | Customer database | Organization |
| `products` | Product catalog | Organization |
| `product_categories` | Product grouping | Organization |
| `product_barcodes` | Barcode mappings | Organization |
| `branch_products` | Per-branch stock | Branch |
| `inventory_balances` | Stock snapshot | Branch |
| `stock_movements` | Immutable ledger | Branch |
| `stock_transfers` | Inter-branch transfers | Organization |
| `suppliers` | Vendor management | Organization |
| `purchase_receipts` | Stock receipts | Branch |
| `invoices` | Sales invoices | Branch |
| `invoice_items` | Invoice line items | Branch |
| `payments` | Payment records | Branch |
| `service_jobs` | Repair/service jobs | Branch |
| `service_job_parts` | Parts used in service | Branch |
| `audit_logs` | Activity tracking | Organization |

## 🔧 API Reference

### Authentication

```bash
POST /api/auth/signup    # Register new user
POST /api/auth/login     # Sign in
POST /api/setup          # Bootstrap organization (one-time)
```

### Customers

```bash
GET  /api/customers              # List customers
POST /api/customers              # Create customer
GET  /api/customers/:id          # Get customer details
PUT  /api/customers/:id          # Update customer
```

### Products

```bash
GET  /api/products               # List products with barcodes
POST /api/products               # Create product (+ barcodes)
```

### Billing

```bash
POST /api/billing/create         # Create invoice (atomic)
GET  /api/billing/:id/pdf        # Download invoice PDF
```

### Services

```bash
GET  /api/services               # List service jobs
POST /api/services               # Create service job
POST /api/services/:id/status    # Transition status
POST /api/services/:id/parts     # Add consumed part
```

### Inventory

```bash
GET  /api/inventory              # Current stock
POST /api/inventory/adjust       # Stock adjustment
POST /api/transfers              # Create transfer
POST /api/transfers/:id/dispatch # Dispatch transfer
POST /api/transfers/:id/receive  # Receive transfer
```

### Purchases

```bash
GET  /api/suppliers              # List suppliers
POST /api/suppliers              # Create supplier
GET  /api/purchases              # List purchase receipts
POST /api/purchases              # Create receipt (updates stock if RECEIVED)
```

### Reports

```bash
GET /api/reports?type=sales-summary&start_date=...&end_date=...
GET /api/reports?type=daily-sales&start_date=...&end_date=...
GET /api/reports?type=payment-methods&start_date=...&end_date=...
```

## 🧪 Testing

```bash
# Run linting
npm run lint

# Type checking
npx tsc --noEmit

# Run tests (when implemented)
npm test
```

## 🚀 Deployment

### Vercel (Frontend)

1. Connect repository to Vercel
2. Add environment variables
3. Deploy

### Supabase (Database)

1. Create Supabase project
2. Run migrations in SQL Editor
3. Configure RLS policies
4. Set up Auth providers (Email/Password)

### Environment Variables (Production)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Keep secret!
NODE_ENV=production
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📞 Support

For issues and feature requests, please open a GitHub issue.

---

**Built with ❤️ for multi-branch business management**