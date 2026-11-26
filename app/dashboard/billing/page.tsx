import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { BillingDashboardView } from '@/components/billing/BillingDashboardView'

export const dynamic = 'force-dynamic'

async function getBillingData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  if (!context.isOwner && !hasPermission(context.permissions, 'billing')) {
    if (hasPermission(context.permissions, 'services')) {
      redirect('/dashboard/services')
    }
    redirect('/dashboard')
  }

  const { data: invoices, error } = await supabaseService
    .from('invoices')
    .select(`
      *,
      customers ( id, customer_name, phone_number ),
      invoice_items (
        id,
        quantity,
        unit_price_snapshot,
        line_total,
        products ( name, sku )
      )
    `)
    .eq('organization_id', context.organization_id)
    .order('invoice_date', { ascending: false })
    .limit(100)

  if (error) {
    console.error("Error fetching invoices:", error)
    return { invoices: [] }
  }

  return { invoices: invoices || [] }
}

export default async function BillingPage() {
  const { invoices } = await getBillingData()

  return (
    <div className="p-6 md:p-8">
      <BillingDashboardView initialInvoices={invoices} />
    </div>
  )
}