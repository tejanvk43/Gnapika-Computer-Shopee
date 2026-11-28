// app/api/public/service-requests/route.ts
import { NextResponse } from 'next/server'
import { createServiceRequest, getServiceRequests, getServiceRequestById } from '@/lib/customerRequests'
import { ensureCustomerExists } from '@/lib/customerSync'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.customer_name || !body.phone_number || !body.problem_description) {
      return NextResponse.json(
        { error: 'Name, phone number, and problem description are required' },
        { status: 400 }
      )
    }

    if (body.service_type === 'home' && !body.address) {
      return NextResponse.json({ error: 'Address is required for Home Service' }, { status: 400 })
    }

    // 1. Auto-sync customer into main customers directory
    try {
      await ensureCustomerExists({
        customer_name: body.customer_name,
        phone_number: body.phone_number,
        alt_phone_number: body.alt_phone_number,
        address: body.address,
        email: body.email,
        source: 'Online Booking',
      })
    } catch (syncErr) {
      console.warn('Customer auto-sync note:', syncErr)
    }

    // 2. Create the service request record
    const record = await createServiceRequest(body)

    return NextResponse.json({
      success: true,
      request: record,
      message: `Your ${
        body.service_type === 'home' ? 'Home Service' : 'Store Visit'
      } request #${record.request_number} has been submitted! Our team will review and confirm shortly.`,
    })
  } catch (error: any) {
    console.error('Service request submission error:', error)
    return NextResponse.json({ error: error?.message || 'Submission failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const phone = searchParams.get('phone')

    if (id) {
      const record = await getServiceRequestById(id)
      if (!record) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      return NextResponse.json({ request: record })
    }

    if (phone) {
      const records = await getServiceRequests(undefined, { phone_number: phone })
      return NextResponse.json({ requests: records })
    }

    const records = await getServiceRequests()
    return NextResponse.json({ requests: records })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed fetching requests' }, { status: 500 })
  }
}
