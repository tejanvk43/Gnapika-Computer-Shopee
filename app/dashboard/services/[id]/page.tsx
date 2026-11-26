import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import Link from 'next/link'
import { PrintServiceSlipButton } from '@/components/services/PrintServiceSlipButton'
import { PrintServiceInvoiceButton } from '@/components/services/PrintServiceInvoiceButton'
import { ServiceBillingCard } from '@/components/services/ServiceBillingCard'
import { ServiceStatusAdvancer } from '@/components/services/ServiceStatusAdvancer'
import { extractAccessories, cleanProblemDescription } from '@/lib/serviceHelpers'
import {
  ArrowLeft,
  Wrench,
  User,
  Phone,
  Laptop,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  PackageCheck,
} from 'lucide-react'

export default async function ServiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  if (!context.isOwner && !hasPermission(context.permissions, 'services')) {
    if (hasPermission(context.permissions, 'billing')) {
      redirect('/dashboard/billing')
    }
    redirect('/dashboard')
  }

  const { data: service, error } = await supabaseService
    .from('service_jobs')
    .select(`
      *,
      customers ( * ),
      user_profiles!service_jobs_assigned_technician_id_fkey ( full_name ),
      service_job_parts (
        *,
        products ( id, name, sku )
      ),
      service_status_history ( * )
    `)
    .eq('id', params.id)
    .eq('organization_id', context.organization_id)
    .single()

  if (error || !service) {
    notFound()
  }

  // Fetch Service Invoice if already generated
  const { data: serviceInvoice } = await supabaseService
    .from('invoices')
    .select(`
      *,
      customers ( * ),
      invoice_items ( * )
    `)
    .filter('invoice_snapshot->>service_job_id', 'eq', params.id)
    .maybeSingle()

  const accessories = extractAccessories(service)
  const cleanProblem = cleanProblemDescription(service.problem_description)

  const statusFlow = ['Received', 'In Progress', 'Completed']
  let currentIndex = statusFlow.indexOf(service.status)
  if (currentIndex === -1) {
    if (service.status === 'Completed' || service.status === 'Delivered') {
      currentIndex = 2
    } else if (service.status === 'Received') {
      currentIndex = 0
    } else {
      // Diagnosing, Waiting for Parts, In Progress map to In Progress
      currentIndex = 1
    }
  }
  const nextStatus = statusFlow[currentIndex + 1]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/services"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Job #{service.service_ref_number}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  service.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : service.status === 'In Progress'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                }`}
              >
                {service.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Registered on {new Date(service.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {serviceInvoice && <PrintServiceInvoiceButton invoice={serviceInvoice} />}
          <PrintServiceSlipButton service={service} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Billing Card (Enter Actual Amount Taken & Generate Bill) */}
          <ServiceBillingCard
            service={service}
            initialInvoice={serviceInvoice}
          />
          {/* Customer & Device Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Laptop className="w-4 h-4 text-orange-600" />
              <span>Customer &amp; Device Information</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Customer Name:</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {service.customers?.customer_name || 'Customer'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Phone Number:</span>
                <p className="font-mono font-semibold text-primary">
                  {service.customers?.phone_number || '-'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Device Type:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {service.device_type}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Brand &amp; Model:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {service.company_brand} {service.model}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Serial Number:</span>
                <p className="font-mono text-slate-600 dark:text-slate-400">
                  {service.serial_number || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Assigned Technician:</span>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {service.user_profiles?.full_name || 'Unassigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Problem & Diagnosis */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-orange-600" />
              <span>Problem, Accessories &amp; Diagnostic Details</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Customer Reported Problem:</span>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {cleanProblem}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Intake Accessories Received from Customer:</span>
                {accessories.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {accessories.map((acc: string) => (
                      <span
                        key={acc}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200 text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                        <span>{acc}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic font-medium p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    Device Only &mdash; No accessories received
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-1">Service Type:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {service.diagnosis || 'Hardware / OS Service'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Estimated Cost:</span>
                  <p className="font-mono font-bold text-base text-primary">
                    ₹{parseFloat(service.estimated_cost || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Status History</span>
            </h2>

            <div className="space-y-3">
              {service.service_status_history?.map((h: any) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {h.status_changed_to}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.changed_at).toLocaleString()}
                      </span>
                    </div>
                    {h.notes && <p className="text-slate-600 dark:text-slate-400 mt-1">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Status Control */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs h-fit space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Workflow Progress
          </h2>

          <div className="space-y-1.5">
            {statusFlow.map((st, idx) => {
              const isCurrent = idx === currentIndex
              const isPast = idx < currentIndex
              return (
                <div
                  key={st}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition ${
                    isCurrent
                      ? 'bg-orange-600 text-white shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <span>{st}</span>
                  {isCurrent && <span className="text-[10px] uppercase font-bold tracking-wider">ACTIVE</span>}
                  {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
              )
            })}
          </div>

          <ServiceStatusAdvancer
            serviceId={service.id}
            currentStatus={service.status}
            nextStatus={nextStatus}
          />
        </div>
      </div>
    </div>
  )
}