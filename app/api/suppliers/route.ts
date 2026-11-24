// app/api/suppliers/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

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
    return NextResponse.json(suppliers || [])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { name, contact_email, phone, address } = body

    if (!name) {
      return NextResponse.json({ error: "Supplier name is required." }, { status: 400 })
    }

    const { data: newSupplier, error } = await supabaseService
      .from('suppliers')
      .insert([{ organization_id: context.organization_id, name, contact_email, phone, address }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(newSupplier, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}