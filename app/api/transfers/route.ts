// app/api/transfers/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function GET() {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: transfers, error } = await supabaseService
      .from('stock_transfers')
      .select(`
        *,
        branches!stock_transfers_source_branch_id_fkey ( name ),
        branches!stock_transfers_destination_branch_id_fkey ( name ),
        stock_transfer_items (
          *,
          products ( name, sku )
        )
      `)
      .eq('organization_id', context.organization_id)
      .order('transfer_date', { ascending: false })

    if (error) throw error
    return NextResponse.json(transfers || [])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { source_branch_id, destination_branch_id, items } = body

    if (source_branch_id === destination_branch_id) {
      return NextResponse.json({ error: "Source and destination branches cannot be the same" }, { status: 400 })
    }

    // Create transfer
    const { data: newTransfer, error } = await supabaseService
      .from('stock_transfers')
      .insert([{
        organization_id: context.organization_id,
        source_branch_id,
        destination_branch_id,
        status: 'PENDING',
        notes: body.notes || ''
      }])
      .select()
      .single()

    if (error) throw error

    // Add transfer items
    const itemInserts = items.map((item: any) => ({
      transfer_id: newTransfer.id,
      product_id: item.product_id,
      quantity: item.quantity
    }))

    const { error: itemsError } = await supabaseService
      .from('stock_transfer_items')
      .insert(itemInserts)

    if (itemsError) throw itemsError

    return NextResponse.json(newTransfer, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}