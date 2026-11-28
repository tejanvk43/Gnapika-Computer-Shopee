// app/api/public/quotation-requests/route.ts
import { NextResponse } from 'next/server'
import { createQuotationRequest, getQuotationRequests } from '@/lib/customerRequests'
import { ensureCustomerExists } from '@/lib/customerSync'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.customer_name || !body.phone_number || !body.requirements_description) {
      return NextResponse.json(
        { error: 'Name, phone number, and requirements description are required' },
        { status: 400 }
      )
    }

    try {
      await ensureCustomerExists({
        customer_name: body.customer_name,
        phone_number: body.phone_number,
        email: body.email,
        company_name: body.company_name,
        source: 'Quotation Inquiry',
      })
    } catch (syncErr) {}

    const record = await createQuotationRequest(body)

    return NextResponse.json({
      success: true,
      request: record,
      message: `Quotation request #${record.request_number} sent directly to the owner! You will receive an official quotation shortly.`,
    })
  } catch (error: any) {
    console.error('Quotation request error:', error)
    return NextResponse.json({ error: error?.message || 'Submission failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    const records = await getQuotationRequests(undefined, { phone_number: phone || undefined })
    return NextResponse.json({ requests: records })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed fetching quotation requests' }, { status: 500 })
  }
}
