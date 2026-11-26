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
    const productId = searchParams.get('product_id') || ''

    if (!serial) {
      return NextResponse.json({ exists: false, error: 'No serial provided' })
    }

    // 1. Fast check in product_barcodes table
    const { data: barcodeMatch } = await supabaseService
      .from('product_barcodes')
      .select('product_id, barcode_value, products ( id, name, sku )')
      .eq('barcode_value', serial)
      .maybeSingle()

    if (barcodeMatch) {
      const prodName = (barcodeMatch.products as any)?.name || 'an existing product'
      return NextResponse.json({
        exists: true,
        source: 'product_barcodes',
        serial,
        productName: prodName,
        message: `Serial number "${serial}" already exists in DB for ${prodName}!`,
      })
    }

    // 2. Check in products table by SKU
    const { data: skuMatch } = await supabaseService
      .from('products')
      .select('id, name, sku')
      .eq('organization_id', context.organization_id)
      .eq('sku', serial)
      .maybeSingle()

    if (skuMatch) {
      return NextResponse.json({
        exists: true,
        source: 'products_sku',
        serial,
        productName: skuMatch.name,
        message: `Serial number "${serial}" matches an existing product SKU (${skuMatch.name})!`,
      })
    }

    // 3. Fast check in audit_logs for past purchase invoices containing this serial
    const { data: pastInvoices } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('organization_id', context.organization_id)
      .eq('action', 'CREATE_PURCHASE_INVOICE')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (pastInvoices && pastInvoices.length > 0) {
      for (const log of pastInvoices) {
        const details = log.details
        if (details?.items && Array.isArray(details.items)) {
          for (const item of details.items) {
            if (
              Array.isArray(item.serial_numbers) &&
              item.serial_numbers.some(
                (s: string) => s.trim().toLowerCase() === serial.toLowerCase()
              )
            ) {
              const productName = item.product_name || 'a purchased item'
              return NextResponse.json({
                exists: true,
                source: 'purchase_history',
                serial,
                productName,
                invoiceNumber: details.invoice_number,
                message: `Serial number "${serial}" was already received in Purchase Invoice ${details.invoice_number || ''} for ${productName}!`,
              })
            }
          }
        }
      }
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
