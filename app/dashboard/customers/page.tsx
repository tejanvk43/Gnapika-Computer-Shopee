// app/dashboard/customers/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import Link from 'next/link'
import { Users, UserPlus, Phone, Mail, FileText, Wrench, Eye } from 'lucide-react'

async function getCustomersData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const { data: customers, error } = await supabaseService
    .from('customers')
    .select(`
      *,
      invoices ( count ),
      service_jobs ( count )
    `)
    .eq('organization_id', context.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching customers:", error)
    return { customers: [] }
  }

  return { customers: customers || [] }
}

export default async function CustomersPage() {
  const { customers } = await getCustomersData()

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Client Directory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Customer Management
          </h1>
          <p className="text-sm text-slate-500">
            Access 360-degree customer records, purchase histories, and active service jobs.
          </p>
        </div>

        <Link
          href="/dashboard/customers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </Link>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">GSTIN</th>
                <th className="p-4 text-center">Invoices</th>
                <th className="p-4 text-center">Services</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No customers found. Click &quot;+ Add Customer&quot; above to add your first customer.
                  </td>
                </tr>
              ) : (
                customers.map((customer: any) => {
                  const invoiceCount = customer.invoices?.[0]?.count || 0
                  const serviceCount = customer.service_jobs?.[0]?.count || 0

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 pl-6">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {customer.customer_name?.substring(0, 2).toUpperCase() || 'CU'}
                          </div>
                          <span>{customer.customer_name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {customer.phone_number ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {customer.phone_number}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        {customer.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {customer.email}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {customer.gstin || '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          <FileText className="w-3 h-3" />
                          {invoiceCount}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <Wrench className="w-3 h-3" />
                          {serviceCount}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View 360</span>
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