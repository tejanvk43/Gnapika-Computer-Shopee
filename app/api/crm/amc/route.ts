// app/api/crm/amc/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { getAmcContracts, createAmcContract, incrementAmcVisit } from '@/lib/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id') || undefined

    const contracts = await getAmcContracts(context.organization_id, customerId)
    return NextResponse.json({ contracts })
  } catch (err: any) {
    console.error('Error in AMC contracts GET:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Increment visit action
    if (body.action === 'record_visit' && body.id) {
      const ok = await incrementAmcVisit(body.id, context.organization_id)
      return NextResponse.json({ success: ok })
    }

    const {
      customer_id,
      contract_number,
      contract_title,
      start_date,
      end_date,
      contract_value = 0,
      billing_frequency = 'Annual',
      service_visits_allowed = 4,
      covered_devices_count = 1,
      covered_devices_details,
      status = 'Active',
      payment_status = 'Paid',
      terms_and_conditions,
    } = body

    if (!customer_id || !contract_title || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Customer, contract title, start date, and end date are required.' },
        { status: 400 }
      )
    }

    const contractNum =
      contract_number?.trim() ||
      `AMC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

    const newContract = await createAmcContract({
      organization_id: context.organization_id,
      customer_id,
      contract_number: contractNum,
      contract_title,
      start_date,
      end_date,
      contract_value: parseFloat(contract_value) || 0,
      billing_frequency,
      service_visits_allowed: parseInt(service_visits_allowed, 10) || 4,
      service_visits_completed: 0,
      covered_devices_count: parseInt(covered_devices_count, 10) || 1,
      covered_devices_details,
      status,
      payment_status,
      terms_and_conditions,
    })

    return NextResponse.json({ success: true, contract: newContract })
  } catch (err: any) {
    console.error('Error in AMC contracts POST:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
