// app/dashboard/billing/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import Link from 'next/link'
import { Receipt, Plus, Eye, Printer, Calendar, User } from 'lucide-react'

async function getBillingData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const { data: invoices, error } = await supabaseService
    .from('invoices')
    .select(`
      *,
      customers ( customer_name, phone_number ),
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
    .limit(50)

  if (error) {
    console.error("Error fetching invoices:", error)
    return { invoices: [] }
  }

  return { invoices: invoices || [] }
}

export default async function BillingPage() {
  const { invoices } = await getBillingData()

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Point of Sale & Invoices</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Billing Management
          </h1>
          <p className="text-sm text-slate-500">
            Generate GST tax invoices, review payments, and print customer bills.
          </p>
        </div>

        <Link
          href="/dashboard/billing/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Sale & Bill</span>
        </Link>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Invoice #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-right">Payment</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No invoices generated yet. Click &quot;+ New Sale &amp; Bill&quot; to open the POS terminal.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice: any) => {
                  const balanceDue = parseFloat(invoice.balance_due || '0')
                  const isPaid = balanceDue <= 0

                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 pl-6 font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {invoice.invoice_number}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        <div>{invoice.customers?.customer_name || 'Walk-in Customer'}</div>
                        {invoice.customers?.phone_number && (
                          <div className="text-xs font-normal text-slate-500 font-mono">
                            {invoice.customers.phone_number}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                          {invoice.invoice_items?.length || 0} items
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(invoice.total_grand_amount || '0').toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        {isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Paid ({invoice.payment_method || 'Cash'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            Due: ₹{balanceDue.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <Link
                          href={`/dashboard/billing/${invoice.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View & Print</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}