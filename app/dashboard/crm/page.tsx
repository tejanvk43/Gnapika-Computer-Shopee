// app/dashboard/crm/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCrmLeads, getCrmActivities, getAmcContracts } from '@/lib/crm'
import { getEnrichedCustomers } from '@/lib/customerSync'
import { CrmDashboard } from '@/components/crm/CrmDashboard'

export const dynamic = 'force-dynamic'

export default async function CrmPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const orgId = context.organization_id

  // 1. Fetch CRM Leads, Activities, AMC Contracts, and Synchronized Customers in parallel
  const [leads, activities, amcs, customers] = await Promise.all([
    getCrmLeads(orgId),
    getCrmActivities(orgId),
    getAmcContracts(orgId),
    getEnrichedCustomers(orgId),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <CrmDashboard
        initialLeads={leads}
        initialActivities={activities}
        initialAmcs={amcs}
        customers={customers}
        currentUserId={context.user?.id}
      />
    </div>
  )
}
