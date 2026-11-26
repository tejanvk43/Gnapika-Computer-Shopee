// app/api/staff/[id]/activity/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!context.isOwner) {
      return NextResponse.json({ error: "Access denied. Only shop owners can view staff activity." }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const staffId = resolvedParams.id

    // 1. Fetch user profile
    const { data: profile } = await supabaseService
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', staffId)
      .maybeSingle()

    // 2. Fetch bills / invoices created by this staff member
    const { data: invoices, error: invErr } = await supabaseService
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        total_grand_amount,
        amount_paid,
        balance_due,
        payment_method,
        customers ( customer_name, phone_number )
      `)
      .eq('created_by_user_id', staffId)
      .eq('organization_id', context.organization_id)
      .order('invoice_date', { ascending: false })
      .limit(50)

    if (invErr) {
      console.warn("Notice querying staff invoices:", invErr)
    }

    // 3. Fetch service jobs assigned to or handled by this staff member
    const { data: serviceJobs, error: srvErr } = await supabaseService
      .from('service_jobs')
      .select(`
        id,
        service_ref_number,
        created_at,
        device_type,
        company_brand,
        model,
        problem_description,
        status,
        estimated_cost,
        customers ( customer_name, phone_number )
      `)
      .eq('assigned_technician_id', staffId)
      .eq('organization_id', context.organization_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (srvErr) {
      console.warn("Notice querying staff service jobs:", srvErr)
    }

    // Totals calculations
    const totalSales = (invoices || []).reduce((sum, inv) => sum + (parseFloat(inv.total_grand_amount) || 0), 0)
    const completedServices = (serviceJobs || []).filter(
      (s) => s.status === 'Completed' || s.status === 'Delivered'
    ).length

    return NextResponse.json({
      staff: profile || { id: staffId, full_name: 'Staff Member' },
      summary: {
        total_invoices: invoices?.length || 0,
        total_sales: Math.round(totalSales * 100) / 100,
        total_services: serviceJobs?.length || 0,
        completed_services: completedServices,
      },
      invoices: invoices || [],
      services: serviceJobs || [],
    })
  } catch (err: any) {
    console.error("Staff activity error:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch staff activity." }, { status: 500 })
  }
}
