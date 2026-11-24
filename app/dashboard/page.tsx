// app/dashboard/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import Link from 'next/link'
import {
  Receipt,
  Wrench,
  Package,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { LiveCustomerSearch } from '@/components/dashboard/LiveCustomerSearch'

async function getDashboardData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const orgId = context.organization_id

  // 1. Fetch recent invoices
  const { data: recentInvoices } = await supabaseService
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_grand_amount,
      amount_paid,
      balance_due,
      customers ( customer_name, phone_number )
    `)
    .eq('organization_id', orgId)
    .order('invoice_date', { ascending: false })
    .limit(8)

  // 2. Fetch incomplete service jobs
  const { data: incompleteServices } = await supabaseService
    .from('service_jobs')
    .select(`
      id,
      service_ref_number,
      created_at,
      device_type,
      company_brand,
      model,
      problem_description,
      status,
      customers ( customer_name, phone_number ),
      user_profiles!service_jobs_assigned_technician_id_fkey ( full_name )
    `)
    .eq('organization_id', orgId)
    .not('status', 'in', '("Completed","Delivered","Cancelled")')
    .order('created_at', { ascending: false })
    .limit(8)

  // 3. Stats
  const { data: allInvoices } = await supabaseService
    .from('invoices')
    .select('total_grand_amount, amount_paid, balance_due')
    .eq('organization_id', orgId)

  const { count: productCount } = await supabaseService
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  const { count: serviceCount } = await supabaseService
    .from('service_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  const totalSales = (allInvoices || []).reduce(
    (sum, inv) => sum + (parseFloat(inv.total_grand_amount) || 0),
    0
  )
  const totalPaid = (allInvoices || []).reduce(
    (sum, inv) => sum + (parseFloat(inv.amount_paid) || 0),
    0
  )
  const totalDue = (allInvoices || []).reduce(
    (sum, inv) => sum + (parseFloat(inv.balance_due) || 0),
    0
  )

  return {
    recentInvoices: recentInvoices || [],
    incompleteServices: incompleteServices || [],
    stats: {
      totalSales,
      totalPaid,
      totalDue,
      invoiceCount: allInvoices?.length || 0,
      productCount: productCount || 0,
      serviceCount: serviceCount || 0,
    },
  }
}

export default async function DashboardPage() {
  const { recentInvoices, incompleteServices, stats } = await getDashboardData()

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Diagnosing':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'In Progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'Waiting for Parts':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-8">
      {/* Universal Search Bar */}
      <div>
        <LiveCustomerSearch />
      </div>

      {/* 4 Action / Stats Cards (Matching Diagram Top Section) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Billing */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <Link
              href="/dashboard/billing/new"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Bill</span>
            </Link>
          </div>
          <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Billing & Sales</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.invoiceCount} <span className="text-xs font-normal text-slate-400">Bills Issued</span>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link href="/dashboard/billing" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              <span>View Past Bills</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Service */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-600 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-600" />
            </div>
            <Link
              href="/dashboard/services/new"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Job</span>
            </Link>
          </div>
          <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Services</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {incompleteServices.length} <span className="text-xs font-normal text-slate-400">Incomplete</span>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link href="/dashboard/services" className="text-xs font-medium text-orange-600 hover:underline flex items-center gap-1">
              <span>Manage Service Jobs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Link>
          </div>
          <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Products</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.productCount} <span className="text-xs font-normal text-slate-400">Items Cataloged</span>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link href="/dashboard/products" className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1">
              <span>View Product List</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Total Sales Summary */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Overview
            </span>
          </div>
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Sales Summary</h3>
          <p className="text-2xl font-bold text-white mt-1">₹{stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span>Collected: ₹{stats.totalPaid.toFixed(0)}</span>
            <span className="text-amber-400 font-medium">Due: ₹{stats.totalDue.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Main Two Overview Sections (Matching Diagram) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Latest Billing and Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Latest Billing & Sales</h2>
            </div>
            <Link href="/dashboard/billing" className="text-xs font-semibold text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Bill ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 pr-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                      No billing records found. Click &quot;New Bill&quot; to issue your first invoice.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv: any) => {
                    const isPaid = parseFloat(inv.balance_due) <= 0
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3.5 pl-5 font-mono font-medium text-primary">
                          <Link href={`/dashboard/billing/${inv.id}`} className="hover:underline">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {inv.customers?.customer_name || 'Walk-in'}
                          </div>
                          <div className="text-xs text-slate-400">{inv.customers?.phone_number || '-'}</div>
                        </td>
                        <td className="p-3.5 text-xs text-slate-500">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right font-medium font-mono text-slate-900 dark:text-white">
                          ₹{parseFloat(inv.total_grand_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {isPaid ? 'Paid' : 'Due'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Incompleted Service Bookings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Incompleted Service Bookings</h2>
            </div>
            <Link href="/dashboard/services" className="text-xs font-semibold text-orange-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Service Ref</th>
                  <th className="p-3.5">Customer & Device</th>
                  <th className="p-3.5">Problem</th>
                  <th className="p-3.5 pr-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {incompleteServices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">
                      No active service jobs. Great job keeping the queue clear!
                    </td>
                  </tr>
                ) : (
                  incompleteServices.map((svc: any) => (
                    <tr key={svc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3.5 pl-5 font-mono font-medium text-orange-600">
                        <Link href={`/dashboard/services/${svc.id}`} className="hover:underline">
                          {svc.service_ref_number}
                        </Link>
                        <div className="text-xs text-slate-400">
                          {new Date(svc.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {svc.customers?.customer_name || 'Customer'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {svc.company_brand} {svc.model} ({svc.device_type})
                        </div>
                      </td>
                      <td className="p-3.5 max-w-xs truncate text-xs text-slate-600 dark:text-slate-400">
                        {svc.problem_description}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(svc.status)}`}>
                          {svc.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}