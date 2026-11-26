// app/api/purchases/check-serial/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const serial = (searchParams.get('serial') || '').trim()

    if (!serial) {
      return NextResponse.json({ exists: false, error: 'No serial provided' })
    }

    // High-speed parallel indexed checks: product_barcodes & products SKU
    const [barcodeRes, skuRes] = await Promise.all([
      supabaseService
        .from('product_barcodes')
        .select('product_id, barcode_value, products ( id, name, sku )')
        .eq('barcode_value', serial)
        .limit(1)
        .maybeSingle(),
      supabaseService
        .from('products')
        .select('id, name, sku')
        .eq('organization_id', context.organization_id)
        .eq('sku', serial)
        .limit(1)
        .maybeSingle(),
    ])

    if (barcodeRes.data) {
      const prodName = (barcodeRes.data.products as any)?.name || 'an existing product'
      return NextResponse.json({
        exists: true,
        source: 'product_barcodes',
        serial,
        productName: prodName,
        message: `Serial number "${serial}" already exists in DB for ${prodName}!`,
      })
    }

    if (skuRes.data) {
      return NextResponse.json({
        exists: true,
        source: 'products_sku',
        serial,
        productName: skuRes.data.name,
        message: `Serial number "${serial}" matches an existing product SKU (${skuRes.data.name})!`,
      })
    }

    // Serial is completely unique
    return NextResponse.json({
      exists: false,
      serial,
    })
  } catch (error: any) {
    console.error('Serial check error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error checking serial' },
      { status: 500 }
    )
  }
}
