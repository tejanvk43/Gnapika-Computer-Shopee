// app/dashboard/customers/[id]/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { getAmcContracts, getCustomerDevices, getCrmActivities } from '@/lib/crm'
import { CustomerDetailView } from '@/components/customers/CustomerDetailView'

export const dynamic = 'force-dynamic'

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

  // 2. Fetch customer invoices with complete details & items
  const { data: invoices } = await supabaseService
    .from('invoices')
    .select(`
      *,
      customers ( customer_name, phone_number, alt_phone_number, email, address, gstin ),
      invoice_items (
        id,
        quantity,
        unit_price_snapshot,
        discount_applied,
        gst_rate_snapshot,
        taxable_amount,
        line_total,
        products ( name, sku, description )
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

  // 4. Fetch CRM data (AMCs, Devices, Activities)
  const [amcs, devices, activities] = await Promise.all([
    getAmcContracts(context.organization_id, customerId),
    getCustomerDevices(context.organization_id, customerId),
    getCrmActivities(context.organization_id, customerId),
  ])

  return (
    <div className="max-w-6xl mx-auto">
      <CustomerDetailView
        customer={customer}
        invoices={invoices || []}
        services={services || []}
        amcs={amcs || []}
        devices={devices || []}
        activities={activities || []}
      />
    </div>
  )
}
