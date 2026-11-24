-- ===================================================
-- PHASE 1: Initial PostgreSQL Schema for Billing System
-- All tables scoped by organization_id and branch_id where required.
-- ===================================================

-- 1. Organization and access
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_memberships (
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Owner', 'Admin')), -- Owner/Admin roles are organization-wide
    PRIMARY KEY (user_profile_id, organization_id)
);

CREATE TABLE branch_memberships (
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Branch Manager', 'Cashier', 'Technician', 'Accountant')), -- Branch-specific roles
    PRIMARY KEY (user_profile_id, branch_id)
);

-- 2. Customer management
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) UNIQUE, -- Unique across organization for easy lookup
    alt_phone_number VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_addresses (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    -- Note: Customer record should hold primary address, this is for history/alternatives
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 3. Product management
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    UNIQUE (organization_id, name)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_barcodes (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    barcode_value VARCHAR(100) UNIQUE NOT NULL, -- EAN-13, UPC-A, etc.
    barcode_type VARCHAR(50) NOT NULL, -- e.g., 'EAN13', 'CODE128'
    PRIMARY KEY (product_id)
);

-- 4. Inventory (Branch-specific)
CREATE TABLE branch_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    current_stock NUMERIC(15, 3) NOT NULL DEFAULT 0.0,
    UNIQUE (branch_id, product_id)
);

CREATE TABLE inventory_balances (
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    balance NUMERIC(15, 3) NOT NULL,
    PRIMARY KEY (branch_id, product_id)
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_change NUMERIC(15, 3) NOT NULL, -- Positive for in, negative for out
    movement_type VARCHAR(50) NOT NULL, -- e.g., 'RECEIPT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT'
    source_ref_id UUID, -- e.g., PurchaseReceipt.id or Invoice.id
    recorded_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    destination_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'DISPATCHED', 'RECEIVED', 'CANCELLED')),
    notes TEXT
);

CREATE TABLE stock_transfer_items (
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 3) NOT NULL,
    PRIMARY KEY (transfer_id, product_id)
);

-- 5. Purchases
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    receipt_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'RECEIVED')),
    recorded_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE TABLE purchase_receipt_items (
    receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 3) NOT NULL,
    purchase_price NUMERIC(10, 4) NOT NULL, -- Price paid to supplier
    gst_rate NUMERIC(5, 2) NOT NULL,
    PRIMARY KEY (receipt_id, product_id)
);

-- 6. Billing
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    total_grand_amount NUMERIC(15, 2) NOT NULL, -- Final payable amount
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
    balance_due NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    invoice_snapshot JSONB NOT NULL, -- Snapshot of products, prices, tax rates at time of sale
    created_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 3) NOT NULL,
    unit_price_snapshot NUMERIC(10, 4) NOT NULL,
    discount_applied NUMERIC(10, 2) NOT NULL,
    gst_rate_snapshot NUMERIC(5, 2) NOT NULL,
    taxable_amount NUMERIC(15, 2) NOT NULL,
    line_total NUMERIC(15, 2) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_ref VARCHAR(255)
);

-- 7. Services
CREATE TABLE service_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    service_ref_number VARCHAR(100) UNIQUE NOT NULL,
    device_type VARCHAR(100),
    company_brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    problem_description TEXT NOT NULL,
    diagnosis TEXT,
    estimated_cost NUMERIC(15, 2),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Received', 'Diagnosing', 'Waiting for Approval', 'Waiting for Parts', 'In Progress', 'Completed', 'Delivered', 'Cancelled')),
    assigned_technician_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    expected_completion_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_job_id UUID NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
    status_changed_to VARCHAR(50) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE service_job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_job_id UUID NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_consumed NUMERIC(15, 3) NOT NULL,
    unit_cost_at_time NUMERIC(10, 4) NOT NULL,
    selling_price_at_time NUMERIC(10, 4) NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. System
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'CUSTOMER_UPDATE', 'INVOICE_CREATE'
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stored_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    mime_type VARCHAR(100),
    uploaded_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================
-- INDEXES AND CONSTRAINTS (To be verified later)
-- ===================================================
-- Indexing for search and lookups (e.g., phone_number, invoice_number, service_ref_number)
CREATE INDEX idx_customers_phone ON customers (phone_number);
CREATE INDEX idx_invoices_number ON invoices (invoice_number);
CREATE INDEX idx_services_ref ON service_jobs (service_ref_number);
CREATE INDEX idx_audit_logs_org ON audit_logs (organization_id);

-- NOTE: Row Level Security (RLS) policies must be applied per table in Supabase
-- based on organization_id and branch_id scoping BEFORE users access data.
