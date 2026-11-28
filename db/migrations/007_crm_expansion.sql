-- db/migrations/007_crm_expansion.sql
-- Complete CRM Expansion for Gnapika Computer Services
-- Tables: Leads/Pipeline, Customer Activities, AMC Contracts, Customer Devices

-- 1. CRM Leads & Sales Inquiry Pipeline
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255),
    company_name VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'Walk-in' CHECK (source IN ('Walk-in', 'Phone Call', 'WhatsApp', 'Quotation Inquiry', 'Reference', 'Website', 'Other')),
    status VARCHAR(50) NOT NULL DEFAULT 'New Lead' CHECK (status IN ('New Lead', 'Contacted', 'Quote Sent', 'Negotiation', 'Won', 'Lost')),
    estimated_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    expected_close_date DATE,
    notes TEXT,
    lost_reason TEXT,
    assigned_staff_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    converted_service_id UUID REFERENCES service_jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_org_status ON crm_leads (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads (contact_phone);

-- 2. Customer Interactions & Follow-Up Reminders
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL DEFAULT 'Note' CHECK (activity_type IN ('Call', 'Meeting', 'WhatsApp', 'Note', 'Email', 'Shop Visit')),
    summary VARCHAR(255) NOT NULL,
    details TEXT,
    follow_up_date DATE,
    follow_up_time VARCHAR(20),
    follow_up_status VARCHAR(20) DEFAULT 'Pending' CHECK (follow_up_status IN ('Pending', 'Completed', 'Cancelled')),
    created_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_act_org_cust ON crm_activities (organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_act_followup ON crm_activities (organization_id, follow_up_date, follow_up_status);

-- 3. Annual Maintenance Contracts (AMC) Tracker
CREATE TABLE IF NOT EXISTS amc_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contract_number VARCHAR(50) NOT NULL,
    contract_title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    billing_frequency VARCHAR(50) DEFAULT 'Annual' CHECK (billing_frequency IN ('Annual', 'Half-Yearly', 'Quarterly', 'Monthly')),
    service_visits_allowed INT NOT NULL DEFAULT 4,
    service_visits_completed INT NOT NULL DEFAULT 0,
    covered_devices_count INT NOT NULL DEFAULT 1,
    covered_devices_details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring Soon', 'Expired', 'Renewed', 'Terminated')),
    payment_status VARCHAR(50) DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Partial', 'Due')),
    terms_and_conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amc_org_status ON amc_contracts (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_amc_end_date ON amc_contracts (organization_id, end_date);

-- 4. Customer Devices & Hardware Assets
CREATE TABLE IF NOT EXISTS customer_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    device_type VARCHAR(50) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    serial_number VARCHAR(100),
    configuration_specs TEXT,
    purchase_date DATE,
    warranty_expiry_date DATE,
    warranty_type VARCHAR(50) DEFAULT 'Shop Warranty' CHECK (warranty_type IN ('Shop Warranty', 'Manufacturer Warranty', 'AMC Covered', 'Out of Warranty', 'Extended Warranty')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_org_cust ON customer_devices (organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON customer_devices (serial_number);

-- 5. Customer Profile Enhancements (Safe ALTER TABLE)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_type') THEN
        ALTER TABLE customers ADD COLUMN customer_type VARCHAR(50) DEFAULT 'Retail Walk-in';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
        ALTER TABLE customers ADD COLUMN credit_limit NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'credit_period_days') THEN
        ALTER TABLE customers ADD COLUMN credit_period_days INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'primary_contact_person') THEN
        ALTER TABLE customers ADD COLUMN primary_contact_person VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tags') THEN
        ALTER TABLE customers ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'crm_notes') THEN
        ALTER TABLE customers ADD COLUMN crm_notes TEXT;
    END IF;
END $$;
