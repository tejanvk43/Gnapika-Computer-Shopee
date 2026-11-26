// app/dashboard/purchases/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { PurchaseBillTerminal } from '@/components/purchases/PurchaseBillTerminal'
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
      suppliers ( name ),
      purchase_receipt_items (
        quantity,
        purchase_price,
        gst_rate,
        products ( name )
      )
    `)
    .eq('organization_id', orgId)
    .order('receipt_date', { ascending: false })
    .limit(10)

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
        /* History View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Purchase Inward History
              </h2>
              <p className="text-xs text-slate-500">
                Past recorded purchases and inventory intake receipts.
              </p>
            </div>
            <Link
              href="/dashboard/purchases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Bill</span>
            </Link>
          </div>

          {pastReceipts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No purchase receipts recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Receipt / Bill #</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Approx Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pastReceipts.map((r: any) => {
                    const items = r.purchase_receipt_items || []
                    const totalAmt = items.reduce((sum: number, it: any) => {
                      const cost = (parseFloat(it.quantity) || 1) * (parseFloat(it.purchase_price) || 0)
                      const tax = cost * ((parseFloat(it.gst_rate) || 0) / 100)
                      return sum + cost + tax
                    }, 0)

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {r.receipt_number}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {r.suppliers?.name || 'Vendor'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(r.receipt_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">
                          {items.length} items
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(totalAmt)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/dashboard/purchases/${r.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          >
                            <span>View Invoice</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
