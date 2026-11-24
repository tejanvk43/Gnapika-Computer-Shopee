# Database Architecture Documentation

## Overview

This document describes the PostgreSQL database schema for the Multi-Branch Billing, Inventory & Service Management System. The architecture follows a multi-tenant design with organization and branch-level scoping, enforced through Row Level Security (RLS) policies.

## Design Principles

1. **Multi-Tenancy**: All business data is scoped to `organization_id`
2. **Branch Independence**: Inventory, billing, and services are branch-scoped
3. **Data Integrity**: UUID primary keys, foreign keys, check constraints
4. **Financial Accuracy**: NUMERIC types for all monetary values
5. **Audit Trail**: Immutable stock movements and audit logs
6. **Historical Preservation**: Invoice snapshots, no hard deletes of financial records

## Core Entity Relationships

```
organizations (1) ←→ (N) branches
organizations (1) ←→ (N) user_profiles
organizations (1) ←→ (N) customers
organizations (1) ←→ (N) products
organizations (1) ←→ (N) product_categories
organizations (1) ←→ (N) suppliers

branches (1) ←→ (N) branch_products
branches (1) ←→ (N) stock_movements
branches (1) ←→ (N) invoices
branches (1) ←→ (N) service_jobs
branches (1) ←→ (N) purchase_receipts

user_profiles (N) ←→ (N) organization_memberships
user_profiles (N) ←→ (N) branch_memberships

products (1) ←→ (N) product_barcodes
products (1) ←→ (N) branch_products
products (1) ←→ (N) invoice_items
products (1) ←→ (N) service_job_parts
products (1) ←→ (N) purchase_receipt_items

customers (1) ←→ (N) invoices
customers (1) ←→ (N) service_jobs

invoices (1) ←→ (N) invoice_items
invoices (1) ←→ (N) payments

service_jobs (1) ←→ (N) service_job_parts
service_jobs (1) ←→ (N) service_status_history

stock_transfers (1) ←→ (N) stock_transfer_items

purchase_receipts (1) ←→ (N) purchase_receipt_items
```

## Table Definitions

### Organization & Access Control

#### `organizations`
```sql
- id: UUID (PK)
- name: VARCHAR(255) UNIQUE
- created_at: TIMESTAMPTZ
```

#### `branches`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- name: VARCHAR(255)
- address: TEXT
- created_at: TIMESTAMPTZ
- UNIQUE(organization_id, name)
```

#### `user_profiles`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- email: VARCHAR(255) UNIQUE
- full_name: VARCHAR(255)
- created_at: TIMESTAMPTZ
```

#### `organization_memberships`
```sql
- user_profile_id: UUID (FK → user_profiles.id) CASCADE
- organization_id: UUID (FK → organizations.id) CASCADE
- role: VARCHAR(50) CHECK ('Owner', 'Admin')
- PRIMARY KEY (user_profile_id, organization_id)
```

#### `branch_memberships`
```sql
- user_profile_id: UUID (FK → user_profiles.id) CASCADE
- branch_id: UUID (FK → branches.id) CASCADE
- role: VARCHAR(50) CHECK ('Branch Manager', 'Cashier', 'Technician', 'Accountant')
- PRIMARY KEY (user_profile_id, branch_id)
```

### Customer Management

#### `customers`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- customer_name: VARCHAR(255)
- phone_number: VARCHAR(50) UNIQUE
- alt_phone_number: VARCHAR(50)
- email: VARCHAR(255)
- address: TEXT
- gstin: VARCHAR(50)
- created_at: TIMESTAMPTZ
```

### Product Management

#### `product_categories`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- name: VARCHAR(100)
- UNIQUE(organization_id, name)
```

#### `products`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- category_id: UUID (FK → product_categories.id) SET NULL
- sku: VARCHAR(100) UNIQUE
- name: VARCHAR(255)
- description: TEXT
- created_at: TIMESTAMPTZ
```

#### `product_barcodes`
```sql
- product_id: UUID (FK → products.id) CASCADE
- barcode_value: VARCHAR(100) UNIQUE
- barcode_type: VARCHAR(50)  -- EAN13, CODE128, UPC-A, QR
- PRIMARY KEY (product_id)
```

### Inventory Management

#### `branch_products`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches.id) CASCADE
- product_id: UUID (FK → products.id) RESTRICT
- current_stock: NUMERIC(15,3) DEFAULT 0
- UNIQUE(branch_id, product_id)
```

#### `inventory_balances`
```sql
- branch_id: UUID (FK → branches.id) CASCADE
- product_id: UUID (FK → products.id) RESTRICT
- balance: NUMERIC(15,3)
- PRIMARY KEY (branch_id, product_id)
```

#### `stock_movements` (Immutable Ledger)
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches.id) CASCADE
- product_id: UUID (FK → products.id) RESTRICT
- quantity_change: NUMERIC(15,3)  -- Positive: IN, Negative: OUT
- movement_type: VARCHAR(50)  -- RECEIPT, SALE, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, SERVICE_CONSUMPTION
- source_ref_id: UUID  -- References invoice, purchase, transfer, etc.
- recorded_by_user_id: UUID (FK → user_profiles.id) SET NULL
- recorded_at: TIMESTAMPTZ
```

#### `stock_transfers`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- source_branch_id: UUID (FK → branches.id) RESTRICT
- destination_branch_id: UUID (FK → branches.id) RESTRICT
- transfer_date: TIMESTAMPTZ
- status: VARCHAR(50) CHECK ('PENDING', 'DISPATCHED', 'RECEIVED', 'CANCELLED')
- notes: TEXT
```

#### `stock_transfer_items`
```sql
- transfer_id: UUID (FK → stock_transfers.id) CASCADE
- product_id: UUID (FK → products.id) RESTRICT
- quantity: NUMERIC(15,3)
- PRIMARY KEY (transfer_id, product_id)
```

### Purchase Management

#### `suppliers`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- name: VARCHAR(255)
- contact_email: VARCHAR(255)
- phone: VARCHAR(50)
- created_at: TIMESTAMPTZ
```

#### `purchase_receipts`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- supplier_id: UUID (FK → suppliers.id) RESTRICT
- branch_id: UUID (FK → branches.id) RESTRICT
- receipt_number: VARCHAR(100) UNIQUE
- receipt_date: TIMESTAMPTZ
- status: VARCHAR(50) CHECK ('DRAFT', 'RECEIVED')
- recorded_by_user_id: UUID (FK → user_profiles.id) SET NULL
```

#### `purchase_receipt_items`
```sql
- receipt_id: UUID (FK → purchase_receipts.id) CASCADE
- product_id: UUID (FK → products.id) RESTRICT
- quantity: NUMERIC(15,3)
- purchase_price: NUMERIC(10,4)
- gst_rate: NUMERIC(5,2)
- PRIMARY KEY (receipt_id, product_id)
```

### Billing Management

#### `invoices`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- branch_id: UUID (FK → branches.id) RESTRICT
- customer_id: UUID (FK → customers.id) RESTRICT
- invoice_number: VARCHAR(100) UNIQUE
- invoice_date: TIMESTAMPTZ
- due_date: TIMESTAMPTZ
- total_grand_amount: NUMERIC(15,2)
- amount_paid: NUMERIC(15,2) DEFAULT 0
- balance_due: NUMERIC(15,2)
- payment_method: VARCHAR(50)
- invoice_snapshot: JSONB  -- Product, price, tax snapshot at time of sale
- created_by_user_id: UUID (FK → user_profiles.id) SET NULL
```

#### `invoice_items`
```sql
- id: UUID (PK)
- invoice_id: UUID (FK → invoices.id) CASCADE
- product_id: UUID (FK → products.id) RESTRICT
- quantity: NUMERIC(15,3)
- unit_price_snapshot: NUMERIC(10,4)
- discount_applied: NUMERIC(10,2)
- gst_rate_snapshot: NUMERIC(5,2)
- taxable_amount: NUMERIC(15,2)
- line_total: NUMERIC(15,2)
```

#### `payments`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- invoice_id: UUID (FK → invoices.id) RESTRICT
- payment_date: TIMESTAMPTZ
- amount: NUMERIC(15,2)
- payment_method: VARCHAR(50)
- transaction_ref: VARCHAR(255)
```

### Service Management

#### `service_jobs`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- customer_id: UUID (FK → customers.id) RESTRICT
- branch_id: UUID (FK → branches.id) RESTRICT
- service_ref_number: VARCHAR(100) UNIQUE
- device_type: VARCHAR(100)
- company_brand: VARCHAR(100)
- model: VARCHAR(100)
- serial_number: VARCHAR(100)
- problem_description: TEXT
- diagnosis: TEXT
- estimated_cost: NUMERIC(15,2)
- status: VARCHAR(50) CHECK ('Received', 'Diagnosing', 'Waiting for Approval', 'Waiting for Parts', 'In Progress', 'Completed', 'Delivered', 'Cancelled')
- assigned_technician_id: UUID (FK → user_profiles.id) SET NULL
- expected_completion_date: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

#### `service_status_history`
```sql
- id: UUID (PK)
- service_job_id: UUID (FK → service_jobs.id) CASCADE
- status_changed_to: VARCHAR(50)
- changed_at: TIMESTAMPTZ
- notes: TEXT
```

#### `service_job_parts`
```sql
- id: UUID (PK)
- service_job_id: UUID (FK → service_jobs.id) CASCADE
- product_id: UUID (FK → products.id) RESTRICT
- quantity_consumed: NUMERIC(15,3)
- unit_cost_at_time: NUMERIC(10,4)
- selling_price_at_time: NUMERIC(10,4)
- consumed_at: TIMESTAMPTZ
```

### System

#### `audit_logs`
```sql
- id: BIGSERIAL (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- user_id: UUID (FK → user_profiles.id) SET NULL
- action: VARCHAR(100)
- entity_type: VARCHAR(100)
- entity_id: UUID
- details: JSONB
- timestamp: TIMESTAMPTZ
```

#### `stored_documents`
```sql
- id: UUID (PK)
- organization_id: UUID (FK → organizations.id) CASCADE
- file_name: VARCHAR(255)
- storage_path: TEXT  -- Supabase Storage path
- mime_type: VARCHAR(100)
- uploaded_by_user_id: UUID (FK → user_profiles.id) SET NULL
- uploaded_at: TIMESTAMPTZ
```

## Indexes

```sql
-- Search & Lookup
CREATE INDEX idx_customers_phone ON customers (phone_number);
CREATE INDEX idx_invoices_number ON invoices (invoice_number);
CREATE INDEX idx_services_ref ON service_jobs (service_ref_number);
CREATE INDEX idx_audit_logs_org ON audit_logs (organization_id);

-- Foreign Key Performance
CREATE INDEX idx_branch_products_branch ON branch_products (branch_id);
CREATE INDEX idx_stock_movements_branch_product ON stock_movements (branch_id, product_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX idx_service_jobs_customer ON service_jobs (customer_id);
CREATE INDEX idx_service_jobs_branch ON service_jobs (branch_id);
```

## Row Level Security Policies

### Organization-Scoped Tables (customers, products, invoices, etc.)

```sql
-- SELECT
CREATE POLICY "org_select" ON customers
FOR SELECT USING (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE
CREATE POLICY "org_modify" ON customers
FOR ALL USING (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);
```

### Branch-Scoped Tables (branch_products, stock_movements, invoices)

```sql
CREATE POLICY "branch_select" ON branch_products
FOR SELECT USING (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
  AND branch_id IN (
    SELECT branch_id
    FROM branch_memberships
    WHERE user_profile_id = auth.uid()
  )
);
```

## Stored Functions

### `create_invoice_and_deduct_stock`
Atomic invoice creation with inventory deduction.

### `increment_branch_stock` / `decrement_branch_stock`
Helper functions for stock adjustments.

### `process_stock_transfer`
Atomic inter-branch transfer processing.

## Data Type Standards

| Data Type | Usage |
|-----------|-------|
| UUID | All primary keys, foreign keys |
| NUMERIC(15,3) | Inventory quantities (supports fractions) |
| NUMERIC(15,2) | Financial amounts (currency) |
| NUMERIC(10,4) | Unit prices (high precision) |
| NUMERIC(5,2) | Tax rates (percentage) |
| TIMESTAMPTZ | All timestamps (timezone aware) |
| JSONB | Invoice snapshots, audit details, flexible data |
| VARCHAR(n) | Constrained text fields |
| TEXT | Unconstrained text (descriptions, addresses) |

## Constraints & Validation

1. **Unique Constraints**: SKU, barcode, invoice number, service ref number
2. **Check Constraints**: Status enums, role enums
3. **Foreign Keys**: CASCADE/RESTRICT/SET NULL as appropriate
4. **NOT NULL**: Required business fields
5. **DEFAULT**: Timestamps, stock defaults

## Migration Strategy

Migrations are versioned and applied sequentially:

1. `001_schema.sql` - Core tables, indexes, base RLS
2. `002_atomic_invoice_function.sql` - Invoice transaction function
3. `003_stock_functions.sql` - Inventory helper functions
4. Future: RLS policy refinement, additional functions