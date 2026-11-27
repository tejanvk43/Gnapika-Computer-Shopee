-- db/migrations/006_attendance_and_expenses.sql
-- Tables for Staff Attendance and Daily Expenses Tracker

-- 1. Staff Attendance Table
CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave')),
    check_in_time VARCHAR(20),
    check_out_time VARCHAR(20),
    notes TEXT,
    recorded_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_profile_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON staff_attendance (organization_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON staff_attendance (user_profile_id, attendance_date);

-- 2. Daily Expenses Table
CREATE TABLE IF NOT EXISTS daily_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason VARCHAR(255) NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
    category VARCHAR(100) DEFAULT 'General',
    notes TEXT,
    created_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON daily_expenses (organization_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON daily_expenses (organization_id, category);
