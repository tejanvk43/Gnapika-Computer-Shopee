// app/api/admin/customer-requests/[id]/convert/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { supabaseService } from '@/lib/supabase'
import { getServiceRequestById, updateServiceRequestStatus } from '@/lib/customerRequests'
import { ensureCustomerExists } from '@/lib/customerSync'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceRequest = await getServiceRequestById(params.id)
    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
    }

    // 1. Ensure customer is in customers table
    const customer = await ensureCustomerExists({
      customer_name: serviceRequest.customer_name,
      phone_number: serviceRequest.phone_number,
      alt_phone_number: serviceRequest.alt_phone_number,
      address: serviceRequest.address,
      email: serviceRequest.email,
      source: 'Online Booking',
    })

    // 2. Generate Next Service Reference Number
    const year = new Date().getFullYear().toString().slice(-2)
    const rand = Math.floor(1000 + Math.random() * 9000)
    const serviceRef = `GCS-SRV${year}-${rand}`

    // 3. Create official Service Job
    const { data: newJob, error: jobErr } = await supabaseService
      .from('service_jobs')
      .insert([
        {
          organization_id: context.organization_id,
          customer_id: customer?.id || null,
          service_ref_number: serviceRef,
          device_type: serviceRequest.device_type || 'Laptop',
          company_brand: serviceRequest.brand || 'Other',
          model: serviceRequest.model || 'Standard',
          problem_description: serviceRequest.problem_description,
          status: 'Received',
          estimated_cost: 0,
        },
      ])
      .select('id, service_ref_number')
      .single()

    if (jobErr) {
      console.error('Service job creation error:', jobErr)
      return NextResponse.json({ error: jobErr.message }, { status: 500 })
    }

    // 4. Update request status to in_progress and link job ID
    await updateServiceRequestStatus(params.id, 'in_progress', {
      converted_service_job_id: newJob.id,
    })

    return NextResponse.json({
      success: true,
      serviceJob: newJob,
      message: `Successfully converted to official Service Job #${newJob.service_ref_number}!`,
    })
  } catch (error: any) {
    console.error('Convert service request error:', error)
    return NextResponse.json({ error: error?.message || 'Conversion failed' }, { status: 500 })
  }
}
