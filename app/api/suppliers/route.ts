// app/api/suppliers/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: suppliers, error } = await supabaseService
      .from('suppliers')
      .select('*')
      .eq('organization_id', context.organization_id)
      .order('name', { ascending: true })

    if (error) throw error

    // Unpack gstin and address from contact_email if stored as JSON
    const formatted = (suppliers || []).map((s: any) => {
      let gstin = ''
      let address = ''
      let email = s.contact_email || ''

      if (email && email.trim().startsWith('{') && email.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(email)
          gstin = parsed.gstin || ''
          address = parsed.address || ''
          email = parsed.email || ''
        } catch {
          // not valid json, leave as is
        }
      }

      return {
        ...s,
        gstin,
        address,
        email,
      }
    })

    return NextResponse.json(formatted)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { name, email, contact_email, phone, address, gstin } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Supplier name is required." }, { status: 400 })
    }

    // Pack email, gstin, and address into contact_email JSON to comply with DB schema
    const packedContact = JSON.stringify({
      email: email || contact_email || '',
      gstin: gstin || '',
      address: address || '',
    })

    const { data: newSupplier, error } = await supabaseService
      .from('suppliers')
      .insert([{
        organization_id: context.organization_id,
        name: name.trim(),
        phone: phone || null,
        contact_email: packedContact,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ...newSupplier,
      gstin: gstin || '',
      address: address || '',
      email: email || '',
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}