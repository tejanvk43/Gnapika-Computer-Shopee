-- db/migrations/005_quotations_table.sql
-- Table to store Quotations / Estimations
-- Run this in the Supabase SQL Editor to create the dedicated quotations table.

CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    quotation_number VARCHAR(100) NOT NULL,
    quotation_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    company_state VARCHAR(100),
    company_gstin VARCHAR(50),
    consignee_name VARCHAR(255),
    consignee_address TEXT,
    consignee_state VARCHAR(100),
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Issued',
    quotation_snapshot JSONB NOT NULL,
    created_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching quotations and filtering by company
CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations (organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company ON quotations (organization_id, company_name);
CREATE INDEX IF NOT EXISTS idx_quotations_num ON quotations (quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations (quotation_date DESC);
