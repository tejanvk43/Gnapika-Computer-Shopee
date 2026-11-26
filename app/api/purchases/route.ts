// app/api/purchases/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 1. Fetch purchase receipts with suppliers and items
    const { data: receipts, error } = await supabaseService
      .from('purchase_receipts')
      .select(`
        *,
        suppliers ( id, name, phone, contact_email ),
        branches ( id, name ),
        purchase_receipt_items (
          receipt_id,
          product_id,
          quantity,
          purchase_price,
          gst_rate,
          products ( id, name, sku, description )
        )
      `)
      .eq('organization_id', context.organization_id)
      .order('receipt_date', { ascending: false })

    if (error) throw error

    // 2. Fetch full purchase invoice snapshots from audit_logs
    const { data: snapshots } = await supabaseService
      .from('audit_logs')
      .select('entity_id, details, timestamp')
      .eq('organization_id', context.organization_id)
      .eq('action', 'CREATE_PURCHASE_INVOICE')
      .order('timestamp', { ascending: false })

    const snapshotMap = new Map<string, any>()
    if (snapshots) {
      for (const s of snapshots) {
        if (s.entity_id && !snapshotMap.has(s.entity_id)) {
          snapshotMap.set(s.entity_id, s.details)
        }
      }
    }

    // Merge snapshots with receipts
    const enriched = (receipts || []).map((r: any) => {
      const snap = snapshotMap.get(r.id) || null
      let supplierGstin = snap?.supplier?.gstin || ''
      let supplierAddress = snap?.supplier?.address || ''

      if (!supplierGstin && r.suppliers?.contact_email) {
        try {
          const parsed = JSON.parse(r.suppliers.contact_email)
          supplierGstin = parsed.gstin || ''
          supplierAddress = parsed.address || ''
        } catch {}
      }

      return {
        ...r,
        invoice_snapshot: snap,
        supplier_gstin: supplierGstin,
        supplier_address: supplierAddress,
      }
    })

    return NextResponse.json(enriched)
  } catch (error: any) {
    console.error('Fetch purchases error:', error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const {
      supplier,
      invoice_number,
      receipt_date,
      branch_id,
      items,
      totals,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required in the purchase bill." }, { status: 400 })
    }

    // 1. Resolve Branch
    let resolvedBranchId = branch_id
    if (!resolvedBranchId) {
      const { data: defaultBranch } = await supabaseService
        .from('branches')
        .select('id')
        .eq('organization_id', context.organization_id)
        .limit(1)
        .maybeSingle()

      if (defaultBranch) {
        resolvedBranchId = defaultBranch.id
      } else {
        // Create a default branch if none exists
        const { data: newBranch } = await supabaseService
          .from('branches')
          .insert([{
            organization_id: context.organization_id,
            name: 'Main Store',
            address: 'Gnapika Computer Shopee, Vijayawada'
          }])
          .select('id')
          .single()
        resolvedBranchId = newBranch?.id
      }
    }

    // 2. Resolve or Create Supplier
    let supplierId = supplier?.id
    const supplierName = (supplier?.name || '').trim()

    if (!supplierId && supplierName) {
      // Check if supplier already exists by name
      const { data: existingSupp } = await supabaseService
        .from('suppliers')
        .select('id, contact_email, phone')
        .eq('organization_id', context.organization_id)
        .ilike('name', supplierName)
        .maybeSingle()

      if (existingSupp) {
        supplierId = existingSupp.id
      } else {
        // Auto-create new supplier
        const packedContact = JSON.stringify({
          email: supplier.email || '',
          gstin: supplier.gstin || '',
          address: supplier.address || '',
        })

        const { data: newSupp, error: suppErr } = await supabaseService
          .from('suppliers')
          .insert([{
            organization_id: context.organization_id,
            name: supplierName,
            phone: supplier.phone || null,
            contact_email: packedContact,
          }])
          .select('id')
          .single()

        if (suppErr) {
          console.error("Error creating supplier:", suppErr)
          throw new Error("Failed to register supplier: " + suppErr.message)
        }
        supplierId = newSupp.id
      }
    }

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier name is required." }, { status: 400 })
    }

    // 3. Resolve Unique Invoice / Receipt Number
    let receiptNumber = (invoice_number || '').trim()
    if (!receiptNumber) {
      receiptNumber = `PUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    // Ensure uniqueness for organization
    const { data: existingReceipt } = await supabaseService
      .from('purchase_receipts')
      .select('id')
      .eq('organization_id', context.organization_id)
      .eq('receipt_number', receiptNumber)
      .maybeSingle()

    if (existingReceipt) {
      receiptNumber = `${receiptNumber}-${Math.floor(100 + Math.random() * 900)}`
    }

    // 4. Create Purchase Receipt Record
    const dateToStore = receipt_date ? new Date(receipt_date).toISOString() : new Date().toISOString()
    const { data: newReceipt, error: receiptError } = await supabaseService
      .from('purchase_receipts')
      .insert([{
        organization_id: context.organization_id,
        supplier_id: supplierId,
        branch_id: resolvedBranchId,
        receipt_number: receiptNumber,
        receipt_date: dateToStore,
        status: 'RECEIVED',
        recorded_by_user_id: context.user.id
      }])
      .select()
      .single()

    if (receiptError) throw receiptError

    // 5. Process Each Item: Product Auto-creation, Stock Increment, Movement Log
    const processedItems: any[] = []

    for (const item of items) {
      const productName = (item.product_name || item.name || '').trim()
      let productId = item.product_id

      // If product ID is not provided, look up or create product in DB
      if (!productId && productName) {
        const { data: existingProd } = await supabaseService
          .from('products')
          .select('id, sku, description')
          .eq('organization_id', context.organization_id)
          .ilike('name', productName)
          .maybeSingle()

        if (existingProd) {
          productId = existingProd.id
        } else {
          // Auto-create product
          const generatedSku = item.sku?.trim() || `${productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
          const desc = `HSN: ${item.hsn_code || '8471'} | Unit Cost: ₹${item.rate || 0}`

          const { data: newProd, error: prodErr } = await supabaseService
            .from('products')
            .insert([{
              organization_id: context.organization_id,
              name: productName,
              sku: generatedSku,
              description: desc,
            }])
            .select('id, sku')
            .single()

          if (prodErr) {
            console.error("Error creating product:", prodErr)
            throw new Error(`Failed to create product "${productName}": ${prodErr.message}`)
          }
          productId = newProd.id
        }
      }

      const qty = parseFloat(item.quantity) || 1
      const rate = parseFloat(item.rate) || 0
      const totalTaxRate = (parseFloat(item.cgst_rate) || 0) + (parseFloat(item.sgst_rate) || 0) + (parseFloat(item.igst_rate) || 0)

      // Increment branch stock via stored RPC
      try {
        await supabaseService.rpc('increment_branch_stock', {
          p_branch_id: resolvedBranchId,
          p_product_id: productId,
          p_quantity: qty,
        })
      } catch (stockErr: any) {
        console.warn('Stock increment fallback notice:', stockErr)
        // Direct upsert into branch_products if RPC failed
        const { data: bp } = await supabaseService
          .from('branch_products')
          .select('id, current_stock')
          .eq('branch_id', resolvedBranchId)
          .eq('product_id', productId)
          .maybeSingle()

        if (bp) {
          await supabaseService
            .from('branch_products')
            .update({ current_stock: (parseFloat(bp.current_stock) || 0) + qty })
            .eq('id', bp.id)
        } else {
          await supabaseService
            .from('branch_products')
            .insert([{
              branch_id: resolvedBranchId,
              product_id: productId,
              current_stock: qty,
            }])
        }
      }

      // Log stock movement
      await supabaseService
        .from('stock_movements')
        .insert([{
          branch_id: resolvedBranchId,
          product_id: productId,
          quantity_change: qty,
          movement_type: 'RECEIPT',
          source_ref_id: newReceipt.id,
          recorded_by_user_id: context.user.id,
          recorded_at: new Date().toISOString(),
        }])

      // Insert purchase receipt item
      await supabaseService
        .from('purchase_receipt_items')
        .insert([{
          receipt_id: newReceipt.id,
          product_id: productId,
          quantity: qty,
          purchase_price: rate,
          gst_rate: totalTaxRate,
        }])

      // Save primary barcode if provided and product doesn't have one yet
      const serials = Array.isArray(item.serial_numbers) ? item.serial_numbers : []
      if (serials.length > 0) {
        const firstSerial = serials[0].trim()
        const { data: existingBarcode } = await supabaseService
          .from('product_barcodes')
          .select('product_id')
          .eq('product_id', productId)
          .maybeSingle()

        if (!existingBarcode && firstSerial) {
          try {
            await supabaseService
              .from('product_barcodes')
              .insert([{
                product_id: productId,
                barcode_value: firstSerial,
                barcode_type: 'CODE128',
              }])
          } catch (barErr) {
            console.warn('Barcode insert notice:', barErr)
          }
        }
      }

      processedItems.push({
        ...item,
        product_id: productId,
        product_name: productName,
        quantity: qty,
        rate,
        serial_numbers: serials,
      })
    }

    // 6. Build Comprehensive Purchase Invoice Snapshot
    const invoiceSnapshot = {
      receipt_id: newReceipt.id,
      invoice_number: receiptNumber,
      receipt_date: dateToStore,
      branch_id: resolvedBranchId,
      supplier: {
        id: supplierId,
        name: supplierName,
        phone: supplier.phone || '',
        gstin: supplier.gstin || '',
        address: supplier.address || '',
        email: supplier.email || '',
      },
      items: processedItems,
      totals: totals || {
        gross_total: processedItems.reduce((s, it) => s + (it.gross_amount || (it.quantity * it.rate)), 0),
        taxable_total: processedItems.reduce((s, it) => s + (it.taxable_amount || (it.quantity * it.rate)), 0),
        cgst_total: processedItems.reduce((s, it) => s + (it.cgst_amount || 0), 0),
        sgst_total: processedItems.reduce((s, it) => s + (it.sgst_amount || 0), 0),
        igst_total: processedItems.reduce((s, it) => s + (it.igst_amount || 0), 0),
        grand_total: processedItems.reduce((s, it) => s + (it.total_amount || 0), 0),
      },
      created_at: new Date().toISOString(),
      recorded_by: context.user?.email || 'Admin',
    }

    // Store complete invoice snapshot in audit_logs for permanent lossless retrieval
    await supabaseService
      .from('audit_logs')
      .insert([{
        organization_id: context.organization_id,
        user_id: context.user.id,
        action: 'CREATE_PURCHASE_INVOICE',
        entity_type: 'PURCHASE_INVOICE',
        entity_id: newReceipt.id,
        details: invoiceSnapshot,
        timestamp: new Date().toISOString(),
      }])

    return NextResponse.json({
      success: true,
      receipt: newReceipt,
      invoice_snapshot: invoiceSnapshot,
    }, { status: 201 })
  } catch (error: any) {
    console.error("Purchase creation error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}