// app/api/crm/leads/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { getCrmLeads, createCrmLead, updateLeadStatus, LeadStatus } from '@/lib/crm'
import { syncCustomer } from '@/lib/customerSync'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') as LeadStatus) || undefined
    const search = searchParams.get('search') || undefined

    const leads = await getCrmLeads(context.organization_id, { status, search })
    return NextResponse.json({ leads })
  } catch (err: any) {
    console.error('Error in CRM leads GET:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Status update action
    if (body.action === 'update_status' && body.id && body.status) {
      const ok = await updateLeadStatus(body.id, context.organization_id, body.status, {
        lost_reason: body.lost_reason,
        notes: body.notes,
      })
      return NextResponse.json({ success: ok })
    }

    // New lead creation
    const {
      title,
      contact_name,
      contact_phone,
      contact_email,
      company_name,
      source = 'Walk-in',
      status = 'New Lead',
      estimated_value = 0,
      expected_close_date,
      notes,
      customer_id,
      assigned_staff_id,
    } = body

    if (!title || !contact_name || !contact_phone) {
      return NextResponse.json(
        { error: 'Inquiry title, contact name, and phone number are required.' },
        { status: 400 }
      )
    }

    let linkedCustomerId = customer_id
    if (!linkedCustomerId && contact_name && contact_phone) {
      try {
        const synced = await syncCustomer(context.organization_id, {
          customer_name: contact_name,
          phone_number: contact_phone,
          email: contact_email,
          company_name: company_name,
        })
        linkedCustomerId = synced?.id
      } catch (err) {
        console.warn('Notice syncing customer for lead:', err)
      }
    }

    const newLead = await createCrmLead({
      organization_id: context.organization_id,
      customer_id: linkedCustomerId,
      title,
      contact_name,
      contact_phone,
      contact_email,
      company_name,
      source,
      status,
      estimated_value: parseFloat(estimated_value) || 0,
      expected_close_date,
      notes,
      assigned_staff_id,
    })

    return NextResponse.json({ success: true, lead: newLead })
  } catch (err: any) {
    console.error('Error in CRM leads POST:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
