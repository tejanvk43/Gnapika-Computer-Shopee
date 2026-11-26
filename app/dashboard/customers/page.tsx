// app/dashboard/customers/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { CustomerListView } from '@/components/customers/CustomerListView'

export const dynamic = 'force-dynamic'

async function getCustomersData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const { data: customers, error } = await supabaseService
    .from('customers')
    .select(`
      *,
      invoices ( id, invoice_number, invoice_date, total_grand_amount, amount_paid, balance_due, payment_method ),
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
    <div className="p-6 md:p-8">
      <CustomerListView initialCustomers={customers} />
    </div>
  )
}