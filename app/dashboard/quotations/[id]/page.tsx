// app/dashboard/quotations/[id]/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getQuotationById } from '@/lib/quotations'
import { QuotationPaperView } from '@/components/quotations/QuotationPaperView'

export default async function QuotationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const quote = await getQuotationById(params.id, context.organization_id)
  if (!quote) {
    notFound()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <QuotationPaperView quote={quote} />
    </div>
  )
}
