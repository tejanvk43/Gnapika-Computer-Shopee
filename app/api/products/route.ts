// app/api/products/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || searchParams.get('query') || ''
    const barcode = searchParams.get('barcode') || ''

    if (barcode) {
      const { data: bMatch } = await supabaseService
        .from('product_barcodes')
        .select(`
          barcode_value,
          products (
            *,
            product_categories ( name ),
            product_barcodes ( barcode_value, barcode_type )
          )
        `)
        .eq('barcode_value', barcode.trim())
        .limit(10)

      const bProds = (bMatch || [])
        .map((b: any) => b.products)
        .filter((p: any) => p && p.organization_id === context.organization_id)

      if (bProds.length > 0) {
        return NextResponse.json(bProds)
      }
    }

    if (q) {
      const cleanQ = q.trim()
      const [nameRes, barcodeRes] = await Promise.all([
        supabaseService
          .from('products')
          .select(`
            *,
            product_categories ( name ),
            product_barcodes ( barcode_value, barcode_type )
          `)
          .eq('organization_id', context.organization_id)
          .or(`name.ilike.%${cleanQ}%,sku.ilike.%${cleanQ}%`)
          .limit(30),
        supabaseService
          .from('product_barcodes')
          .select(`
            barcode_value,
            products (
              *,
              product_categories ( name ),
              product_barcodes ( barcode_value, barcode_type )
            )
          `)
          .ilike('barcode_value', `%${cleanQ}%`)
          .limit(20)
      ])

      const barcodeProducts = (barcodeRes.data || [])
        .map((b: any) => b.products)
        .filter((p: any) => p && p.organization_id === context.organization_id)

      const merged = new Map<string, any>()
      for (const p of (nameRes.data || [])) merged.set(p.id, p)
      for (const p of barcodeProducts) merged.set(p.id, p)

      return NextResponse.json(Array.from(merged.values()))
    }

    const { data: products, error } = await supabaseService
      .from('products')
      .select(`
        *,
        product_categories ( name ),
        product_barcodes ( barcode_value, barcode_type )
      `)
      .eq('organization_id', context.organization_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(products || [])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    let { name, sku, description, category_id, barcodes, quantity, cost_price } = body

    if (!name) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 })
    }

    if (!sku) {
      sku = 'SKU-' + Date.now().toString(36).toUpperCase()
    }

    // Insert product
    const { data: newProduct, error: productError } = await supabaseService
      .from('products')
      .insert([{
        organization_id: context.organization_id,
        name,
        sku,
        description: description || (cost_price ? `Unit Cost: ₹${cost_price}` : null),
        category_id: category_id || null,
      }])
      .select()
      .single()

    if (productError) {
      if (productError.code === '23505') {
        // If SKU collided, append random string
        const uniqueSku = `${sku}-${Math.floor(100 + Math.random() * 900)}`
        const { data: retryProduct, error: retryError } = await supabaseService
          .from('products')
          .insert([{
            organization_id: context.organization_id,
            name,
            sku: uniqueSku,
            description: description || null,
            category_id: category_id || null,
          }])
          .select()
          .single()

        if (retryError) throw retryError
        return handleProductCreated(retryProduct, barcodes, quantity, context.organization_id)
      }
      throw productError
    }

    return handleProductCreated(newProduct, barcodes, quantity, context.organization_id)
  } catch (error: any) {
    console.error("Product creation error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

async function handleProductCreated(newProduct: any, barcodes: any[], quantity: number | undefined, organizationId: string) {
  // Handle barcode insertion if provided
  if (barcodes && barcodes.length > 0) {
    const barcodeInserts = barcodes
      .filter((b: any) => b.value && b.value.trim() !== '')
      .map((b: any) => ({
        product_id: newProduct.id,
        barcode_value: b.value.trim(),
        barcode_type: b.type || 'CODE128',
      }))

    if (barcodeInserts.length > 0) {
      const { error: barcodeError } = await supabaseService
        .from('product_barcodes')
        .insert(barcodeInserts)

      if (barcodeError) {
        console.warn('Barcode insert warning (might already exist):', barcodeError.message)
      }
    }
  }

  // Handle stock insertion if quantity was provided
  if (quantity && quantity > 0) {
    try {
      // Find branch for organization
      let { data: branch } = await supabaseService
        .from('branches')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1)
        .single()

      if (!branch) {
        // Create default branch
        const { data: newBranch } = await supabaseService
          .from('branches')
          .insert([{ organization_id: organizationId, name: 'Main Store' }])
          .select('id')
          .single()
        branch = newBranch
      }

      if (branch) {
        await supabaseService
          .from('branch_products')
          .insert([{
            branch_id: branch.id,
            product_id: newProduct.id,
            current_stock: quantity,
          }])
      }
    } catch (stockErr) {
      console.warn("Stock initialization notice:", stockErr)
    }
  }

  return NextResponse.json(newProduct, { status: 201 })
}