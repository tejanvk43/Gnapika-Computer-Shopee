import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'
import { generateNextServiceRefNumber } from '@/lib/sequence'
import { extractAccessories, cleanProblemDescription } from '@/lib/serviceHelpers'

export const dynamic = 'force-dynamic'

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

    const formattedServices = (services || []).map((svc: any) => ({
      ...svc,
      accessories: extractAccessories(svc),
      clean_problem_description: cleanProblemDescription(svc.problem_description),
    }))

    return NextResponse.json(formattedServices)
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
      accessories,
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

    // Generate sequential service reference number (Format: GCS-SER<FY>/<Sequence>, e.g. GCS-SER26-27/1)
    const serviceRefNumber = await generateNextServiceRefNumber(context.organization_id)

    // Process accessories list
    const accessoriesList: string[] = Array.isArray(accessories)
      ? accessories.map((a: string) => String(a).trim()).filter(Boolean)
      : (typeof accessories === 'string' && accessories.trim()
          ? accessories.split(',').map((a: string) => a.trim()).filter(Boolean)
          : [])
    const accessoriesText = accessoriesList.join(', ')

    const baseJobData: any = {
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
    }

    let newService: any = null

    // Try inserting with native accessories column first
    const { data: insertedWithAcc, error: accError } = await supabaseService
      .from('service_jobs')
      .insert([{
        ...baseJobData,
        accessories: accessoriesText || null,
      }])
      .select(`
        *,
        customers ( customer_name, phone_number, alt_phone_number, address, email )
      `)
      .single()

    if (!accError && insertedWithAcc) {
      newService = insertedWithAcc
    } else if (accError?.code === '42703' || accError?.message?.includes('accessories')) {
      // Column 'accessories' does not exist in schema yet - fallback to embedding tag in problem_description
      const fallbackProblem = accessoriesText
        ? `${baseJobData.problem_description}\n\n[Accessories: ${accessoriesText}]`
        : baseJobData.problem_description

      const { data: fallbackService, error: fallbackError } = await supabaseService
        .from('service_jobs')
        .insert([{
          ...baseJobData,
          problem_description: fallbackProblem,
        }])
        .select(`
          *,
          customers ( customer_name, phone_number, alt_phone_number, address, email )
        `)
        .single()

      if (fallbackError) throw fallbackError
      newService = fallbackService
    } else if (accError) {
      throw accError
    }

    // Always attach parsed accessories array & clean description to response
    newService.accessories = accessoriesList
    newService.clean_problem_description = problem_description || 'Diagnostic & Service'

    // Initial status history entry
    await supabaseService
      .from('service_status_history')
      .insert([{
        service_job_id: newService.id,
        status_changed_to: 'Received',
        changed_at: new Date().toISOString(),
        notes: accessoriesText ? `Service job registered. Accessories received: ${accessoriesText}` : 'Service job registered',
      }])

    return NextResponse.json(newService, { status: 201 })
  } catch (error: any) {
    console.error("Service registration error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}