// app/dashboard/customers/[id]/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { CustomerDetailView } from '@/components/customers/CustomerDetailView'

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const customerId = params.id

  // 1. Fetch customer details
  const { data: customer, error: customerError } = await supabaseService
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('organization_id', context.organization_id)
    .single()

  if (customerError || !customer) {
    notFound()
  }

  // 2. Fetch customer invoices with item product names
  const { data: invoices } = await supabaseService
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_grand_amount,
      amount_paid,
      balance_due,
      payment_method,
      invoice_items (
        id,
        quantity,
        line_total,
        products ( name, sku )
      )
    `)
    .eq('customer_id', customerId)
    .eq('organization_id', context.organization_id)
    .order('invoice_date', { ascending: false })

  // 3. Fetch customer service jobs
  const { data: services } = await supabaseService
    .from('service_jobs')
    .select(`
      id,
      service_ref_number,
      created_at,
      device_type,
      company_brand,
      model,
      problem_description,
      diagnosis,
      estimated_cost,
      status,
      expected_completion_date
    `)
    .eq('customer_id', customerId)
    .eq('organization_id', context.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto">
      <CustomerDetailView
        customer={customer}
        invoices={invoices || []}
        services={services || []}
      />
    </div>
  )
}
