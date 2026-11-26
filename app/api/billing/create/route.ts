// app/api/billing/create/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'
import { generateNextInvoiceNumber } from '@/lib/sequence'

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const {
      customer,
      items = [],
      subtotal,
      gst_amount,
      grand_total,
      service_charge,
      service_charge_description,
      payment_method,
      branch_id,
    } = body

    const numServiceCharge = Math.max(0, parseFloat(service_charge) || 0)
    const serviceChargeDesc = (service_charge_description || 'Service Charge').trim()

    if ((!items || items.length === 0) && numServiceCharge <= 0) {
      return NextResponse.json({ error: "At least one product item or service charge is required in the bill." }, { status: 400 })
    }

    // 1. Resolve or Create Customer
    let customerId = customer?.id

    if (!customerId && customer?.customer_name) {
      // Check if exists by phone
      if (customer.phone_number) {
        const { data: existingCustomer } = await supabaseService
          .from('customers')
          .select('id')
          .eq('organization_id', context.organization_id)
          .eq('phone_number', customer.phone_number)
          .maybeSingle()

        if (existingCustomer) {
          customerId = existingCustomer.id
        }
      }

      // If still not found, create new customer
      if (!customerId) {
        const { data: newCustomer, error: custErr } = await supabaseService
          .from('customers')
          .insert([{
            organization_id: context.organization_id,
            customer_name: customer.customer_name,
            phone_number: customer.phone_number || null,
            alt_phone_number: customer.alt_phone_number || null,
            email: customer.email || null,
            address: customer.address || null,
            gstin: customer.gstin || null,
          }])
          .select()
          .single()

        if (custErr) throw custErr
        customerId = newCustomer.id
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: "Customer information is required." }, { status: 400 })
    }

    // 2. Resolve default branch if not provided
    let activeBranchId = branch_id
    if (!activeBranchId) {
      const { data: defaultBranch } = await supabaseService
        .from('branches')
        .select('id')
        .eq('organization_id', context.organization_id)
        .limit(1)
        .maybeSingle()

      activeBranchId = defaultBranch?.id
    }

    // If still no branch, create default branch
    if (!activeBranchId) {
      const { data: newBranch } = await supabaseService
        .from('branches')
        .insert([{
          organization_id: context.organization_id,
          name: 'Main Branch',
        }])
        .select()
        .single()

      activeBranchId = newBranch?.id
    }

    // 3. Generate sequential Invoice Number (Format: GCS<FY>/<Sequence>, e.g. GCS26-27/1)
    const invoiceNumber = await generateNextInvoiceNumber(context.organization_id)

    const finalGrandTotal = parseFloat(grand_total) || 0
    const paymentMethod = payment_method || 'Cash'

    // Compute initial amount paid and outstanding balance due
    const finalAmountPaid = body.amount_paid !== undefined
      ? Math.min(finalGrandTotal, Math.max(0, parseFloat(body.amount_paid) || 0))
      : finalGrandTotal
    const balanceDue = Math.max(0, Math.round((finalGrandTotal - finalAmountPaid) * 100) / 100)

    // 4. Insert Invoice
    const invoiceSnapshot = {
      items,
      service_charge: numServiceCharge,
      service_charge_description: serviceChargeDesc,
      subtotal,
      gst_amount,
      grand_total: finalGrandTotal,
      amount_paid: finalAmountPaid,
      balance_due: balanceDue,
      customer,
      payment_method: paymentMethod,
    }

    const { data: newInvoice, error: invoiceError } = await supabaseService
      .from('invoices')
      .insert([{
        organization_id: context.organization_id,
        branch_id: activeBranchId,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        total_grand_amount: finalGrandTotal,
        amount_paid: finalAmountPaid,
        balance_due: balanceDue,
        payment_method: paymentMethod,
        invoice_snapshot: invoiceSnapshot,
        created_by_user_id: context.user?.id || null,
      }])
      .select(`
        *,
        customers ( customer_name, phone_number, email, address, gstin )
      `)
      .single()

    if (invoiceError) throw invoiceError

    // Record initial payment entry in payments table if any amount was paid
    if (finalAmountPaid > 0) {
      try {
        await supabaseService.from('payments').insert([{
          organization_id: context.organization_id,
          invoice_id: newInvoice.id,
          payment_date: new Date().toISOString(),
          amount: finalAmountPaid,
          payment_method: paymentMethod,
          transaction_ref: body.transaction_ref || 'Initial Payment at Bill Generation',
        }])
      } catch (payErr) {
        console.warn("Notice: Initial payment logging:", payErr)
      }
    }

    // 5. Insert Invoice Items & Automatically Deduct Branch Stock
    if (items && items.length > 0) {
      const invoiceItemInserts = items.map((it: any) => {
        const qty = parseFloat(it.quantity) || 1
        const unitPrice = parseFloat(it.unit_price) || 0
        const discount = parseFloat(it.discount) || 0
        const gross = Math.max(0, (unitPrice * qty) - discount)
        const gstRate = 18.00
        const taxFactor = gstRate / (100 + gstRate)
        const itemGst = Math.round(gross * taxFactor * 100) / 100
        const taxable = Math.round((gross - itemGst) * 100) / 100
        const lineTotal = gross

        return {
          invoice_id: newInvoice.id,
          product_id: it.product_id,
          quantity: qty,
          unit_price_snapshot: unitPrice,
          discount_applied: discount,
          gst_rate_snapshot: gstRate,
          taxable_amount: taxable,
          line_total: lineTotal,
        }
      })

      const { error: itemsError } = await supabaseService
        .from('invoice_items')
        .insert(invoiceItemInserts)

      if (itemsError) console.error("Error inserting invoice items:", itemsError)

      // 6. Update inventory stock for each billed product
      for (const it of items) {
        if (!it.product_id) continue
        const qtySold = parseFloat(it.quantity) || 1

        try {
          // Check existing stock record
          const { data: existingBp } = await supabaseService
            .from('branch_products')
            .select('id, current_stock')
            .eq('branch_id', activeBranchId)
            .eq('product_id', it.product_id)
            .maybeSingle()

          if (existingBp) {
            const currentStockNum = parseFloat(existingBp.current_stock) || 0
            // Allow stock to go negative if billed beyond existing stock
            const updatedStock = currentStockNum - qtySold

            await supabaseService
              .from('branch_products')
              .update({ current_stock: updatedStock })
              .eq('id', existingBp.id)
          } else {
            // First time tracking for this product at this branch - set negative stock
            await supabaseService
              .from('branch_products')
              .insert([{
                branch_id: activeBranchId,
                product_id: it.product_id,
                current_stock: -qtySold,
              }])
          }

          // Record stock movement audit entry
          await supabaseService
            .from('stock_movements')
            .insert([{
              branch_id: activeBranchId,
              product_id: it.product_id,
              quantity_change: -qtySold,
              movement_type: 'SALE',
              source_ref_id: newInvoice.id,
              recorded_by_user_id: context.user?.id || null,
            }])
        } catch (stockErr) {
          console.warn(`Stock deduction notice for product ${it.product_id}:`, stockErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      invoice: newInvoice,
      invoice_number: invoiceNumber,
    }, { status: 201 })
  } catch (error: any) {
    console.error("Billing creation error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}