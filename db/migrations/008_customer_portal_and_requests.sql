-- Migration: 008_customer_portal_and_requests.sql
-- Description: Customer service bookings, quotation requests, and real-time chat

-- 1. Customer Service Requests (Home Service & Store Service)
CREATE TABLE IF NOT EXISTS public.customer_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('home', 'store')),
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    alt_phone_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    device_type VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    preferred_date DATE NOT NULL,
    preferred_time_slot VARCHAR(50) NOT NULL,
    problem_description TEXT NOT NULL,
    voice_note_url TEXT,
    image_urls TEXT[] DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed')),
    rejection_reason TEXT,
    assigned_technician_id UUID,
    assigned_technician_name VARCHAR(255),
    converted_service_job_id UUID REFERENCES public.service_jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customer Quotation Requests (Sent directly to Owner)
CREATE TABLE IF NOT EXISTS public.customer_quotation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    requirements_description TEXT NOT NULL,
    budget_range VARCHAR(100),
    urgency VARCHAR(50) DEFAULT 'Normal',
    reference_image_urls TEXT[] DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'quoted', 'rejected')),
    owner_reply TEXT,
    quoted_amount NUMERIC(12, 2),
    converted_quotation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Live Chat Messages (for accepted service requests)
CREATE TABLE IF NOT EXISTS public.service_request_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.customer_service_requests(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'team')),
    sender_name VARCHAR(255) NOT NULL,
    message_text TEXT,
    image_url TEXT,
    audio_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_csr_org_status ON public.customer_service_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_csr_phone ON public.customer_service_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_cqr_org_status ON public.customer_quotation_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_cqr_phone ON public.customer_quotation_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_srm_request_id ON public.service_request_messages(request_id);
