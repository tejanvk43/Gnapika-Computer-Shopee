// app/api/products/stock/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { product_id, quantity_to_add, notes, branch_id } = body

    if (!product_id) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 })
    }

    const qtyToAdd = parseFloat(quantity_to_add)
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      return NextResponse.json({ error: "Please enter a valid positive quantity to add." }, { status: 400 })
    }

    // Resolve branch
    let targetBranchId = branch_id
    if (!targetBranchId) {
      const { data: branch } = await supabaseService
        .from('branches')
        .select('id')
        .eq('organization_id', context.organization_id)
        .limit(1)
        .maybeSingle()

      targetBranchId = branch?.id
    }

    if (!targetBranchId) {
      const { data: newBranch } = await supabaseService
        .from('branches')
        .insert([{ organization_id: context.organization_id, name: 'Main Store' }])
        .select('id')
        .single()
      targetBranchId = newBranch?.id
    }

    // Check existing branch_product
    const { data: existingBp } = await supabaseService
      .from('branch_products')
      .select('id, current_stock')
      .eq('branch_id', targetBranchId)
      .eq('product_id', product_id)
      .maybeSingle()

    let updatedStock = qtyToAdd

    if (existingBp) {
      const current = parseFloat(existingBp.current_stock) || 0
      updatedStock = current + qtyToAdd

      const { error: updateErr } = await supabaseService
        .from('branch_products')
        .update({ current_stock: updatedStock })
        .eq('id', existingBp.id)

      if (updateErr) throw updateErr
    } else {
      const { error: insertErr } = await supabaseService
        .from('branch_products')
        .insert([{
          branch_id: targetBranchId,
          product_id,
          current_stock: updatedStock,
        }])

      if (insertErr) throw insertErr
    }

    // Record stock movement
    try {
      await supabaseService
        .from('stock_movements')
        .insert([{
          branch_id: targetBranchId,
          product_id,
          quantity_change: qtyToAdd,
          movement_type: 'RECEIPT',
          recorded_by_user_id: context.user?.id || null,
        }])
    } catch (movErr) {
      console.warn("Stock movement audit warning:", movErr)
    }

    return NextResponse.json({
      success: true,
      product_id,
      added_quantity: qtyToAdd,
      current_stock: updatedStock,
      message: `Successfully added ${qtyToAdd} units. New stock: ${updatedStock}`,
    })
  } catch (error: any) {
    console.error("Stock update error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}
