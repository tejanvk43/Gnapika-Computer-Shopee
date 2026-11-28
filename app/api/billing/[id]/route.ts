// app/api/billing/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const invoiceId = params.id
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const { data: invoice, error } = await supabaseService
      .from('invoices')
      .select(`
        *,
        customers ( customer_name, phone_number, alt_phone_number, email, address, gstin ),
        invoice_items (
          id,
          quantity,
          unit_price_snapshot,
          discount_applied,
          gst_rate_snapshot,
          taxable_amount,
          line_total,
          products ( name, sku, description )
        )
      `)
      .eq('id', invoiceId)
      .eq('organization_id', context.organization_id)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({ invoice })
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
