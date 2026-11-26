import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import Link from 'next/link'
import { Wrench, Plus, Eye, Laptop, User } from 'lucide-react'
import { extractAccessories, cleanProblemDescription } from '@/lib/serviceHelpers'

async function getServicesData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  if (!context.isOwner && !hasPermission(context.permissions, 'services')) {
    if (hasPermission(context.permissions, 'billing')) {
      redirect('/dashboard/billing')
    }
    redirect('/dashboard')
  }

  const { data: services, error } = await supabaseService
    .from('service_jobs')
    .select(`
      *,
      customers ( customer_name, phone_number ),
      user_profiles!service_jobs_assigned_technician_id_fkey ( full_name ),
      service_job_parts (
        id,
        quantity_consumed,
        products ( name, sku )
      )
    `)
    .eq('organization_id', context.organization_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching services:", error)
    return { services: [] }
  }

  return { services: services || [] }
}

export default async function ServicesPage() {
  const { services } = await getServicesData()

  const statusColors: Record<string, string> = {
    'Received': 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
    'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    'Completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            <Wrench className="w-4 h-4" />
            <span>Repairs & Service Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Service Management
          </h1>
          <p className="text-sm text-slate-500">
            Track intake jobs, diagnostic progress, parts consumed, and issue dual confirmation slips.
          </p>
        </div>

        <Link
          href="/dashboard/services/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register Service Job</span>
        </Link>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Service Ref #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Device</th>
                <th className="p-4">Problem</th>
                <th className="p-4">Status</th>
                <th className="p-4">Technician</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No service jobs registered yet. Click &quot;+ Register Service Job&quot; above to create one.
                  </td>
                </tr>
              ) : (
                services.map((service: any) => (
                  <tr key={service.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4 pl-6 font-mono font-bold text-xs text-orange-600">
                      {service.service_ref_number}
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                      {new Date(service.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      <div>{service.customers?.customer_name || 'Customer'}</div>
                      <div className="text-xs font-normal text-slate-500 font-mono">
                        {service.customers?.phone_number || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {service.company_brand} {service.model}
                      </div>
                      <div className="text-slate-500">{service.device_type}</div>
                    </td>
                    <td className="p-4 max-w-xs text-xs text-slate-600 dark:text-slate-400">
                      <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {cleanProblemDescription(service.problem_description)}
                      </div>
                      {extractAccessories(service).length > 0 && (
                        <div className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold truncate mt-0.5">
                          + {extractAccessories(service).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[service.status] || 'bg-slate-100 text-slate-800'}`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                      {service.user_profiles?.full_name || 'Unassigned'}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Link
                        href={`/dashboard/services/${service.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage &amp; Slip</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}