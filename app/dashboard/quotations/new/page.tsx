// app/dashboard/quotations/new/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { generateNextQuotationNumber } from '@/lib/sequence'
import { QuotationEditor } from '@/components/quotations/QuotationEditor'

export default async function NewQuotationPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // Requirement: "this only done by the owner only"
  if (!context.isOwner) {
    redirect('/dashboard/quotations')
  }

  const nextQuoteNumber = await generateNextQuotationNumber(context.organization_id)

  // Fetch existing companies / corporate customers
  const { data: customerRows } = await supabaseService
    .from('customers')
    .select('customer_name, address, gstin, phone_number')
    .eq('organization_id', context.organization_id)
    .limit(50)

  const existingCompanies = (customerRows || []).map((c: any) => ({
    name: c.customer_name,
    address: c.address,
    gstin: c.gstin,
    phone: c.phone_number,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <QuotationEditor
        nextQuoteNumber={nextQuoteNumber}
        existingCompanies={existingCompanies}
      />
    </div>
  )
}
