// app/api/quotations/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { getQuotations, saveQuotation, getCompanyQuotationSummary } from '@/lib/quotations'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company') || undefined

    const quotations = await getQuotations(context.organization_id, company)
    const companies = await getCompanyQuotationSummary(context.organization_id)

    return NextResponse.json({
      quotations,
      companies,
      isOwner: context.isOwner,
    })
  } catch (error: any) {
    console.error('Error fetching quotations:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Restriction requested by User: "this only done by the owner only"
    if (!context.isOwner) {
      return NextResponse.json(
        { error: 'Access Denied: Only the shop owner can author or edit quotations.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (!body.quotation_name || !body.company_name) {
      return NextResponse.json(
        { error: 'Quotation Name and Company Name are required.' },
        { status: 400 }
      )
    }

    const saved = await saveQuotation(body, context.organization_id, context.user.id)

    return NextResponse.json({
      success: true,
      quotation: saved,
      message: 'Quotation saved successfully.',
    })
  } catch (error: any) {
    console.error('Error saving quotation:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
