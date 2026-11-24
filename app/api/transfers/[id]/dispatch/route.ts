// app/api/transfers/[id]/dispatch/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    // Verify ownership and status
    const { data: transfer, error: checkError } = await supabaseService
      .from('stock_transfers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.organization_id)
      .single()

    if (checkError || !transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    if (transfer.status !== 'PENDING') return NextResponse.json({ error: "Transfer not in PENDING state" }, { status: 400 })

    // Update status to DISPATCHED
    const { error: dispatchError } = await supabaseService
      .from('stock_transfers')
      .update({ status: 'DISPATCHED' })
      .eq('id', id)

    if (dispatchError) throw dispatchError

    // Deduct stock from source branch and log movements
    const { data: items, error: itemsError } = await supabaseService
      .from('stock_transfer_items')
      .select('*')
      .eq('transfer_id', id)

    if (itemsError) throw itemsError

    for (const item of items) {
      // Check stock
      const { data: stock } = await supabaseService
        .from('branch_products')
        .select('current_stock')
        .eq('branch_id', transfer.source_branch_id)
        .eq('product_id', item.product_id)
        .single()

      if (!stock || stock.current_stock < item.quantity) {
        // Rollback status
        await supabaseService
          .from('stock_transfers')
          .update({ status: 'PENDING' })
          .eq('id', id)
        return NextResponse.json({ error: `Insufficient stock for product ${item.product_id}` }, { status: 400 })
      }

      // Deduct from source
      await supabaseService
        .from('branch_products')
        .update({ current_stock: stock.current_stock - item.quantity })
        .eq('branch_id', transfer.source_branch_id)
        .eq('product_id', item.product_id)

      // Log movement
      await supabaseService
        .from('stock_movements')
        .insert([{
          branch_id: transfer.source_branch_id,
          product_id: item.product_id,
          quantity_change: -item.quantity,
          movement_type: 'TRANSFER_OUT',
          source_ref_id: id,
          recorded_by_user_id: context.user.id,
          recorded_at: new Date().toISOString()
        }])
    }

    return NextResponse.json({ success: true, message: "Transfer dispatched" })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}