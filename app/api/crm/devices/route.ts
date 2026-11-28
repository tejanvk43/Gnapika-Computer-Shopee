// app/api/crm/devices/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { getCustomerDevices, registerCustomerDevice } from '@/lib/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id') || undefined

    const devices = await getCustomerDevices(context.organization_id, customerId)
    return NextResponse.json({ devices })
  } catch (err: any) {
    console.error('Error in customer devices GET:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      customer_id,
      device_type,
      brand,
      model,
      serial_number,
      configuration_specs,
      purchase_date,
      warranty_expiry_date,
      warranty_type = 'Shop Warranty',
      notes,
    } = body

    if (!customer_id || !device_type || !brand) {
      return NextResponse.json(
        { error: 'Customer, device type, and brand are required.' },
        { status: 400 }
      )
    }

    const device = await registerCustomerDevice({
      organization_id: context.organization_id,
      customer_id,
      device_type,
      brand,
      model,
      serial_number,
      configuration_specs,
      purchase_date,
      warranty_expiry_date,
      warranty_type,
      notes,
    })

    return NextResponse.json({ success: true, device })
  } catch (err: any) {
    console.error('Error in customer devices POST:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
