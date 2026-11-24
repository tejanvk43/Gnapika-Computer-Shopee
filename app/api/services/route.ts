// app/api/services/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function GET() {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: services, error } = await supabaseService
      .from('service_jobs')
      .select(`
        *,
        customers ( customer_name, phone_number, address ),
        user_profiles!service_jobs_assigned_technician_id_fkey ( full_name ),
        service_job_parts ( id, quantity_consumed, products ( name, sku ) )
      `)
      .eq('organization_id', context.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(services)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const {
      customer,
      customer_id,
      branch_id,
      device_type,
      company_brand,
      model,
      serial_number,
      problem_description,
      service_type,
      estimated_cost,
      assigned_technician_id,
      expected_completion_date,
    } = body

    // 1. Resolve or Create Customer
    let resolvedCustomerId = customer_id || customer?.id

    if (!resolvedCustomerId && customer?.customer_name) {
      if (customer.phone_number) {
        const { data: existing } = await supabaseService
          .from('customers')
          .select('id')
          .eq('organization_id', context.organization_id)
          .eq('phone_number', customer.phone_number)
          .maybeSingle()

        if (existing) {
          resolvedCustomerId = existing.id
        }
      }

      if (!resolvedCustomerId) {
        const { data: newCustomer, error: custError } = await supabaseService
          .from('customers')
          .insert([{
            organization_id: context.organization_id,
            customer_name: customer.customer_name,
            phone_number: customer.phone_number || null,
            alt_phone_number: customer.alt_phone_number || null,
            email: customer.email || null,
            address: customer.address || null,
          }])
          .select()
          .single()

        if (custError) throw custError
        resolvedCustomerId = newCustomer.id
      }
    }

    if (!resolvedCustomerId) {
      return NextResponse.json({ error: "Customer name or customer selection is required." }, { status: 400 })
    }

    // 2. Resolve default branch
    let activeBranchId = branch_id
    if (!activeBranchId) {
      const { data: defaultBranch } = await supabaseService
        .from('branches')
        .select('id')
        .eq('organization_id', context.organization_id)
        .limit(1)
        .maybeSingle()

      activeBranchId = defaultBranch?.id
    }

    if (!activeBranchId) {
      const { data: newBranch } = await supabaseService
        .from('branches')
        .insert([{
          organization_id: context.organization_id,
          name: 'Main Branch',
        }])
        .select()
        .single()

      activeBranchId = newBranch?.id
    }

    // Generate unique service reference number
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    const randSuffix = Math.floor(100 + Math.random() * 900)
    const serviceRefNumber = `SRV-${dateCode}-${randSuffix}`

    const { data: newService, error } = await supabaseService
      .from('service_jobs')
      .insert([{
        organization_id: context.organization_id,
        customer_id: resolvedCustomerId,
        branch_id: activeBranchId,
        service_ref_number: serviceRefNumber,
        device_type: device_type || 'Laptop',
        company_brand: company_brand || 'General',
        model: model || 'Standard',
        serial_number: serial_number || null,
        problem_description: problem_description || 'Diagnostic & Service',
        diagnosis: service_type || null,
        estimated_cost: parseFloat(estimated_cost) || 0,
        assigned_technician_id: assigned_technician_id || null,
        expected_completion_date: expected_completion_date || null,
        status: 'Received',
      }])
      .select(`
        *,
        customers ( customer_name, phone_number, alt_phone_number, address, email )
      `)
      .single()

    if (error) throw error

    // Initial status history entry
    await supabaseService
      .from('service_status_history')
      .insert([{
        service_job_id: newService.id,
        status_changed_to: 'Received',
        changed_at: new Date().toISOString(),
        notes: 'Service job registered',
      }])

    return NextResponse.json(newService, { status: 201 })
  } catch (error: any) {
    console.error("Service registration error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}