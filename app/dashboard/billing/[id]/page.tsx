// app/dashboard/billing/[id]/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { InvoiceDetailView } from '@/components/billing/InvoiceDetailView'

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

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
    .eq('id', params.id)
    .eq('organization_id', context.organization_id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  return (
    <div className="py-4">
      <InvoiceDetailView invoice={invoice} />
    </div>
  )
}
