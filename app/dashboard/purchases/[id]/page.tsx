// app/dashboard/purchases/[id]/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { PurchaseInvoiceDetailView } from '@/components/purchases/PurchaseInvoiceDetailView'

async function getPurchaseInvoice(id: string) {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // 1. Fetch purchase receipt
  const { data: receipt, error } = await supabaseService
    .from('purchase_receipts')
    .select(`
      *,
      suppliers ( id, name, phone, contact_email ),
      branches ( id, name ),
      purchase_receipt_items (
        receipt_id,
        product_id,
        quantity,
        purchase_price,
        gst_rate,
        products ( id, name, sku, description )
      )
    `)
    .eq('id', id)
    .eq('organization_id', context.organization_id)
    .single()

  if (error || !receipt) return null

  // 2. Fetch full purchase invoice snapshot from audit_logs
  const { data: logEntry } = await supabaseService
    .from('audit_logs')
    .select('details')
    .eq('entity_id', id)
    .eq('action', 'CREATE_PURCHASE_INVOICE')
    .maybeSingle()

  const snapshot = logEntry?.details || null

  let supplierGstin = snapshot?.supplier?.gstin || ''
  let supplierAddress = snapshot?.supplier?.address || ''

  if (!supplierGstin && receipt.suppliers?.contact_email) {
    try {
      const parsed = JSON.parse(receipt.suppliers.contact_email)
      supplierGstin = parsed.gstin || ''
      supplierAddress = parsed.address || ''
    } catch {}
  }

  return {
    ...receipt,
    invoice_snapshot: snapshot,
    supplier_gstin: supplierGstin,
    supplier_address: supplierAddress,
  }
}

export default async function PurchaseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const purchase = await getPurchaseInvoice(params.id)
  if (!purchase) notFound()

  return <PurchaseInvoiceDetailView purchase={purchase} />
}
