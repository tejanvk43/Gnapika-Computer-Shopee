// app/api/customers/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || searchParams.get('q') || ''
    const phone = searchParams.get('phone') || ''

    let dbQuery = supabaseService
      .from('customers')
      .select(`
        *,
        invoices ( id, invoice_number, invoice_date, total_grand_amount ),
        service_jobs ( id, service_ref_number, created_at, status, device_type )
      `)
      .eq('organization_id', context.organization_id)

    if (phone) {
      dbQuery = dbQuery.or(`phone_number.eq.${phone},alt_phone_number.eq.${phone}`)
    } else if (query) {
      dbQuery = dbQuery.or(`customer_name.ilike.%${query}%,phone_number.ilike.%${query}%,alt_phone_number.ilike.%${query}%`)
    }

    const { data: customers, error } = await dbQuery
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(customers || [])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { customer_name, phone_number, alt_phone_number, email, address, gstin } = await request.json()

    if (!customer_name) {
      return NextResponse.json({ error: "Customer name is required." }, { status: 400 })
    }

    // Check if customer with this phone number already exists
    if (phone_number) {
      const { data: existing } = await supabaseService
        .from('customers')
        .select('*')
        .eq('organization_id', context.organization_id)
        .eq('phone_number', phone_number)
        .maybeSingle()

      if (existing) {
        // Update existing customer record with latest provided info
        const { data: updated, error: updateError } = await supabaseService
          .from('customers')
          .update({
            customer_name,
            alt_phone_number: alt_phone_number || existing.alt_phone_number,
            email: email || existing.email,
            address: address || existing.address,
            gstin: gstin || existing.gstin,
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) throw updateError
        return NextResponse.json(updated, { status: 200 })
      }
    }

    // Insert new customer strictly scoped to organization
    const { data: newCustomer, error } = await supabaseService
      .from('customers')
      .insert([{
        organization_id: context.organization_id,
        customer_name,
        phone_number: phone_number || null,
        alt_phone_number: alt_phone_number || null,
        email: email || null,
        address: address || null,
        gstin: gstin || null,
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "A customer with this phone number already exists in the organization." }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(newCustomer, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}