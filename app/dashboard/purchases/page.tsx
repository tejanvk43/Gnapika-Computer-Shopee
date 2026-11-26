// app/dashboard/purchases/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { PurchaseBillTerminal } from '@/components/purchases/PurchaseBillTerminal'
import { PurchaseHistoryView } from '@/components/purchases/PurchaseHistoryView'
import Link from 'next/link'
import {
  ShoppingCart,
  Receipt,
  Building2,
  Calendar,
  ExternalLink,
  Plus,
  Package,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

export const dynamic = 'force-dynamic'

async function getPurchasesData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const orgId = context.organization_id

  // 1. Fetch suppliers
  const { data: rawSuppliers } = await supabaseService
    .from('suppliers')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })

  const suppliers = (rawSuppliers || []).map((s: any) => {
    let gstin = ''
    let address = ''
    let email = s.contact_email || ''

    if (email && email.trim().startsWith('{') && email.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(email)
        gstin = parsed.gstin || ''
        address = parsed.address || ''
        email = parsed.email || ''
      } catch {}
    }

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      gstin,
      address,
      email,
    }
  })

  // 2. Fetch existing products for instant autocomplete
  const { data: products } = await supabaseService
    .from('products')
    .select('id, name, sku, description')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  // 3. Fetch past purchase receipts
  const { data: pastReceipts } = await supabaseService
    .from('purchase_receipts')
    .select(`
      id,
      receipt_number,
      receipt_date,
      status,
      suppliers ( id, name, phone, contact_email ),
      purchase_receipt_items (
        quantity,
        purchase_price,
        gst_rate,
        products ( name )
      )
    `)
    .eq('organization_id', orgId)
    .order('receipt_date', { ascending: false })
    .limit(100)

  return {
    suppliers: suppliers || [],
    products: products || [],
    pastReceipts: pastReceipts || [],
  }
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const { suppliers, products, pastReceipts } = await getPurchasesData()
  const showHistory = searchParams?.tab === 'history'

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/purchases"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              !showHistory
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            + Record Purchase Bill
          </Link>
          <Link
            href="/dashboard/purchases?tab=history"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              showHistory
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Purchase History ({pastReceipts.length})
          </Link>
        </div>
      </div>

      {!showHistory ? (
        <PurchaseBillTerminal
          initialSuppliers={suppliers}
          initialProducts={products}
        />
      ) : (
        <PurchaseHistoryView
          initialReceipts={pastReceipts}
          suppliers={suppliers}
        />
      )}
    </div>
  )
}
