// app/api/quotations/[id]/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { getQuotationById, deleteQuotation } from '@/lib/quotations'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quote = await getQuotationById(params.id, context.organization_id)
    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    return NextResponse.json({ quotation: quote, isOwner: context.isOwner })
  } catch (error: any) {
    console.error('Error fetching single quotation:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Owner can delete quotations
    if (!context.isOwner) {
      return NextResponse.json(
        { error: 'Access Denied: Only the shop owner can delete quotations.' },
        { status: 403 }
      )
    }

    await deleteQuotation(params.id, context.organization_id)

    return NextResponse.json({ success: true, message: 'Quotation deleted successfully.' })
  } catch (error: any) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
