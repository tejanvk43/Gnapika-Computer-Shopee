// app/dashboard/services/new/page.tsx
import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ServiceBookingForm } from '@/components/services/ServiceBookingForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewServiceJobPage({
  searchParams,
}: {
  searchParams: { phone?: string; customer_id?: string }
}) {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  if (!context.isOwner && !hasPermission(context.permissions, 'services')) {
    if (hasPermission(context.permissions, 'billing')) {
      redirect('/dashboard/billing')
    }
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/services"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Create a New Service</h1>
          <p className="text-xs text-slate-500">Book customer repairs, diagnostic jobs & issue dual slips</p>
        </div>
      </div>

      <ServiceBookingForm
        initialPhone={searchParams.phone || ''}
        initialCustomerId={searchParams.customer_id || ''}
      />
    </div>
  )
}
