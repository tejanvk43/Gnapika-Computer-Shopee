// app/api/services/[id]/generate-bill/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'
import { generateNextServiceInvoiceNumber } from '@/lib/sequence'

export async function POST(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const body = await request.json()
    const {
      actual_cost,
      payment_method = 'Cash',
      payment_mode = 'full', // 'full' | 'partial' | 'credit'
      amount_paid = 0,
      description,
      work_notes,
    } = body

    const actualTaxable = Math.max(0, parseFloat(actual_cost) || 0)
    if (actualTaxable <= 0) {
      return NextResponse.json({ error: "Please enter a valid actual amount taken for this service." }, { status: 400 })
    }

    // 1. Fetch Service Job with Customer & Branch
    const { data: service, error: serviceErr } = await supabaseService
      .from('service_jobs')
      .select(`
        *,
        customers ( * )
      `)
      .eq('id', id)
      .eq('organization_id', context.organization_id)
      .single()

    if (serviceErr || !service) {
      return NextResponse.json({ error: "Service job not found." }, { status: 404 })
    }

    // 2. Check if a service bill was already created for this service job
    const { data: existingBill } = await supabaseService
      .from('invoices')
      .select('id, invoice_number, total_grand_amount, amount_paid, balance_due')
      .filter('invoice_snapshot->>service_job_id', 'eq', id)
      .maybeSingle()

    if (existingBill) {
      return NextResponse.json({
        error: `A service bill (${existingBill.invoice_number}) has already been generated for this job.`,
        invoice: existingBill
      }, { status: 400 })
    }

    // 3. Resolve Branch
    let activeBranchId = service.branch_id
    if (!activeBranchId) {
      const { data: defaultBranch } = await supabaseService
        .from('branches')
        .select('id')
        .eq('organization_id', context.organization_id)
        .limit(1)
        .maybeSingle()
      activeBranchId = defaultBranch?.id
    }

    // 4. Generate Sequential Service Invoice Number (Format: GCS-SER<FY>/<Sequence>, e.g. GCS-SER26-27/1)
    const invoiceNumber = await generateNextServiceInvoiceNumber(context.organization_id)

    // 5. Calculate GST (Taxable rate + 18% GST)
    const cgst = Math.round(actualTaxable * 0.09 * 100) / 100
    const sgst = Math.round(actualTaxable * 0.09 * 100) / 100
    const totalGst = Math.round((cgst + sgst) * 100) / 100
    const grandTotal = Math.round((actualTaxable + totalGst) * 100) / 100

    const effectivePayMethod = payment_mode === 'credit' ? 'Due / Credit' : payment_method
    const finalAmountPaid = payment_mode === 'full'
      ? grandTotal
      : payment_mode === 'credit'
      ? 0
      : Math.min(grandTotal, Math.max(0, parseFloat(amount_paid) || 0))
    const balanceDue = Math.max(0, Math.round((grandTotal - finalAmountPaid) * 100) / 100)

    const itemName = description?.trim() || `Service & Repair Charges: ${service.company_brand || ''} ${service.model || ''} (${service.device_type || 'Device'})`

    const billItem = {
      name: itemName,
      sku: 'SERVICE',
      hsn_code: '998713',
      quantity: 1,
      unit_price: actualTaxable,
      unit_price_snapshot: actualTaxable,
      discount: 0,
      discount_applied: 0,
      taxable_amount: actualTaxable,
      gst_rate_snapshot: 18.00,
      line_total: grandTotal,
      serial_number: service.serial_number || '',
    }

    // 6. Build Invoice Snapshot
    const invoiceSnapshot = {
      is_service_bill: true,
      service_job_id: service.id,
      service_ref_number: service.service_ref_number,
      device_details: {
        device_type: service.device_type,
        company_brand: service.company_brand,
        model: service.model,
        serial_number: service.serial_number,
      },
      actual_cost: actualTaxable,
      subtotal: actualTaxable,
      gst_amount: totalGst,
      grand_total: grandTotal,
      amount_paid: finalAmountPaid,
      balance_due: balanceDue,
      payment_method: effectivePayMethod,
      customer: service.customers,
      items: [billItem],
      notes: work_notes || `Service completion invoice for Job #${service.service_ref_number}`,
    }

    // 7. Insert Invoice
    const { data: newInvoice, error: invErr } = await supabaseService
      .from('invoices')
      .insert([{
        organization_id: context.organization_id,
        branch_id: activeBranchId,
        customer_id: service.customer_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        total_grand_amount: grandTotal,
        amount_paid: finalAmountPaid,
        balance_due: balanceDue,
        payment_method: effectivePayMethod,
        invoice_snapshot: invoiceSnapshot,
        created_by_user_id: context.user?.id || null,
      }])
      .select(`
        *,
        customers ( customer_name, phone_number, email, address, gstin )
      `)
      .single()

    if (invErr || !newInvoice) {
      console.error("Error creating service invoice:", invErr)
      throw new Error(invErr?.message || "Failed to create service invoice")
    }

    // 8. Insert Invoice Item
    const { error: itemErr } = await supabaseService
      .from('invoice_items')
      .insert([{
        invoice_id: newInvoice.id,
        product_id: null,
        quantity: 1,
        unit_price_snapshot: actualTaxable,
        discount_applied: 0,
        gst_rate_snapshot: 18.00,
        taxable_amount: actualTaxable,
        line_total: grandTotal,
      }])

    if (itemErr) {
      console.warn("Notice inserting service invoice_item:", itemErr)
    }

    // 9. Record Initial Payment Entry in payments table
    if (finalAmountPaid > 0) {
      try {
        await supabaseService.from('payments').insert([{
          organization_id: context.organization_id,
          invoice_id: newInvoice.id,
          payment_date: new Date().toISOString(),
          amount: finalAmountPaid,
          payment_method: effectivePayMethod,
          transaction_ref: `Service Bill Payment (Ref: ${service.service_ref_number})`,
        }])
      } catch (payErr) {
        console.warn("Notice: Initial payment logging:", payErr)
      }
    }

    // 10. Update Service Job to Completed
    await supabaseService
      .from('service_jobs')
      .update({ status: 'Completed' })
      .eq('id', id)
      .eq('organization_id', context.organization_id)

    // Log status history
    await supabaseService
      .from('service_status_history')
      .insert([{
        service_job_id: id,
        status_changed_to: 'Completed',
        notes: `Service completed and billed under invoice ${invoiceNumber} (Actual amount taken: ₹${actualTaxable.toFixed(2)}, Net Payable: ₹${grandTotal.toFixed(2)})`,
        changed_at: new Date().toISOString(),
      }])

    return NextResponse.json({
      success: true,
      message: `Service Bill ${invoiceNumber} generated successfully!`,
      invoice_number: invoiceNumber,
      invoice: {
        ...newInvoice,
        items: [billItem],
      },
    })
  } catch (err: any) {
    console.error("Generate service bill error:", err)
    return NextResponse.json({ error: err.message || "Failed to generate service bill" }, { status: 500 })
  }
}
