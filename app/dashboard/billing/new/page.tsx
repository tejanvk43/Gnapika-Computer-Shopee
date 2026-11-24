// app/dashboard/billing/new/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { POSBillingTerminal } from '@/components/billing/POSBillingTerminal'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { phone?: string; customer_id?: string }
}) {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // Fetch products for fast local search
  const { data: products } = await supabaseService
    .from('products')
    .select(`
      id,
      name,
      sku,
      description,
      product_categories ( name ),
      product_barcodes ( barcode_value, barcode_type )
    `)
    .eq('organization_id', context.organization_id)
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/billing"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Create New Bill</h1>
            <p className="text-xs text-slate-500">POS Billing, Barcode Scan & Instant GST Calculation</p>
          </div>
        </div>
      </div>

      <POSBillingTerminal
        initialProducts={products || []}
        initialPhone={searchParams.phone || ''}
        initialCustomerId={searchParams.customer_id || ''}
      />
    </div>
  )
}