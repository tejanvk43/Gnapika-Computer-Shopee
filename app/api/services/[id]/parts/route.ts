// app/api/services/[id]/parts/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { product_id, quantity_consumed, unit_cost_at_time, selling_price_at_time } = await request.json()

    if (!product_id || !quantity_consumed || quantity_consumed <= 0) {
      return NextResponse.json({ error: "Invalid product or quantity" }, { status: 400 })
    }

    // 1. Get service job to find branch_id
    const { data: service, error: serviceError } = await supabaseService
      .from('service_jobs')
      .select('branch_id, status')
      .eq('id', id)
      .eq('organization_id', context.organization_id)
      .single()

    if (serviceError || !service) return NextResponse.json({ error: "Service job not found" }, { status: 404 })

    // 2. Check stock and deduct atomically (similar to invoice logic)
    const { data: stockRecord, error: stockError } = await supabaseService
      .from('branch_products')
      .select('current_stock')
      .eq('branch_id', service.branch_id)
      .eq('product_id', product_id)
      .single()

    if (stockError || !stockRecord) {
      return NextResponse.json({ error: "Product not found in branch inventory" }, { status: 404 })
    }

    if (stockRecord.current_stock < quantity_consumed) {
      return NextResponse.json({ error: "Insufficient stock for this part" }, { status: 400 })
    }

    // 3. Deduct stock
    const { error: deductError } = await supabaseService
      .from('branch_products')
      .update({ current_stock: stockRecord.current_stock - quantity_consumed })
      .eq('branch_id', service.branch_id)
      .eq('product_id', product_id)

    if (deductError) throw deductError

    // 4. Log stock movement
    await supabaseService
      .from('stock_movements')
      .insert([{
        branch_id: service.branch_id,
        product_id: product_id,
        quantity_change: -quantity_consumed,
        movement_type: 'SERVICE_CONSUMPTION',
        source_ref_id: id,
        recorded_by_user_id: context.user.id,
        recorded_at: new Date().toISOString()
      }])

    // 5. Record part consumption
    const { data: newPart, error: partError } = await supabaseService
      .from('service_job_parts')
      .insert([{
        service_job_id: id,
        product_id: product_id,
        quantity_consumed: quantity_consumed,
        unit_cost_at_time: unit_cost_at_time || 0,
        selling_price_at_time: selling_price_at_time || 0,
        consumed_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (partError) throw partError

    return NextResponse.json(newPart, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}