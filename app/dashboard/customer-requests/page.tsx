// app/dashboard/customer-requests/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getServiceRequests, getQuotationRequests } from '@/lib/customerRequests'
import { CustomerRequestsDashboard } from '@/components/customer-requests/CustomerRequestsDashboard'

export const dynamic = 'force-dynamic'

export default async function CustomerRequestsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const [serviceRequests, quotationRequests] = await Promise.all([
    getServiceRequests(context.organization_id),
    getQuotationRequests(context.organization_id),
  ])

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <CustomerRequestsDashboard
        initialServiceRequests={serviceRequests}
        initialQuotationRequests={quotationRequests}
        isOwner={context.isOwner}
      />
    </div>
  )
}
