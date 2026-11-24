// app/api/purchases/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function GET() {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: purchases, error } = await supabaseService
      .from('purchase_receipts')
      .select(`
        *,
        suppliers ( name ),
        branches ( name ),
        purchase_receipt_items (
          *,
          products ( name, sku )
        )
      `)
      .eq('organization_id', context.organization_id)
      .order('receipt_date', { ascending: false })

    if (error) throw error
    return NextResponse.json(purchases || [])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { supplier_id, branch_id, receipt_number, receipt_date, items, status = 'DRAFT' } = body

    // Create purchase receipt
    const { data: newReceipt, error: receiptError } = await supabaseService
      .from('purchase_receipts')
      .insert([{
        organization_id: context.organization_id,
        supplier_id,
        branch_id,
        receipt_number,
        receipt_date: receipt_date || new Date().toISOString(),
        status,
        recorded_by_user_id: context.user.id
      }])
      .select()
      .single()

    if (receiptError) throw receiptError

    // If status is RECEIVED, update inventory
    if (status === 'RECEIVED') {
      for (const item of items) {
        const { product_id, quantity, purchase_price, gst_rate } = item

        // Update branch_products stock
        await supabaseService.rpc('increment_branch_stock', {
          p_branch_id: branch_id,
          p_product_id: product_id,
          p_quantity: quantity
        })

        // Log stock movement
        await supabaseService
          .from('stock_movements')
          .insert([{
            branch_id,
            product_id,
            quantity_change: quantity,
            movement_type: 'RECEIPT',
            source_ref_id: newReceipt.id,
            recorded_by_user_id: context.user.id,
            recorded_at: new Date().toISOString()
          }])

        // Insert receipt item
        await supabaseService
          .from('purchase_receipt_items')
          .insert([{
            receipt_id: newReceipt.id,
            product_id,
            quantity,
            purchase_price,
            gst_rate
          }])
      }
    }

    return NextResponse.json(newReceipt, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}