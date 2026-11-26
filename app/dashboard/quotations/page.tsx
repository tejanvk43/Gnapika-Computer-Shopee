// app/dashboard/quotations/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getQuotations, getCompanyQuotationSummary } from '@/lib/quotations'
import { QuotationsDashboardView } from '@/components/quotations/QuotationsDashboardView'

export default async function QuotationsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const quotations = await getQuotations(context.organization_id)
  const companySummary = await getCompanyQuotationSummary(context.organization_id)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <QuotationsDashboardView
        quotations={quotations}
        isOwner={context.isOwner}
        companySummary={companySummary}
      />
    </div>
  )
}
