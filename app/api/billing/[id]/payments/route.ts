// app/api/billing/[id]/payments/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const invoiceId = params.id
    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    // Fetch invoice details
    const { data: invoice, error: invErr } = await supabaseService
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        total_grand_amount,
        amount_paid,
        balance_due,
        payment_method,
        customers ( id, customer_name, phone_number )
      `)
      .eq('id', invoiceId)
      .eq('organization_id', context.organization_id)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Fetch all payment slots for this invoice
    const { data: payments, error: payErr } = await supabaseService
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: true })

    if (payErr) throw payErr

    return NextResponse.json({
      invoice,
      payments: payments || [],
    })
  } catch (error: any) {
    console.error("Error fetching invoice payments:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const invoiceId = params.id
    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const { amount, payment_method, transaction_ref, notes, payment_date } = body

    const payAmount = parseFloat(amount)
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid positive payment amount." }, { status: 400 })
    }

    // Fetch current invoice record
    const { data: invoice, error: invErr } = await supabaseService
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('organization_id', context.organization_id)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
    }

    const currentPaid = parseFloat(invoice.amount_paid || '0')
    const grandTotal = parseFloat(invoice.total_grand_amount || '0')
    const currentDue = parseFloat(invoice.balance_due || Math.max(0, grandTotal - currentPaid).toString())

    if (currentDue <= 0) {
      return NextResponse.json({ error: "This invoice is already fully paid!" }, { status: 400 })
    }

    // Limit collection to remaining balance due
    const finalCollection = Math.min(currentDue, payAmount)
    const newPaid = Math.round((currentPaid + finalCollection) * 100) / 100
    const newBalanceDue = Math.max(0, Math.round((grandTotal - newPaid) * 100) / 100)

    const payMethod = payment_method || invoice.payment_method || 'Cash'
    const refDetails = transaction_ref || (notes ? `Note: ${notes}` : 'Payment Slot Collection')

    // 1. Insert into payments table
    const { data: newPayment, error: payInsertErr } = await supabaseService
      .from('payments')
      .insert([{
        organization_id: context.organization_id,
        invoice_id: invoice.id,
        payment_date: payment_date ? new Date(payment_date).toISOString() : new Date().toISOString(),
        amount: finalCollection,
        payment_method: payMethod,
        transaction_ref: refDetails,
      }])
      .select()
      .single()

    if (payInsertErr) {
      console.error("Error recording payment:", payInsertErr)
      throw payInsertErr
    }

    // 2. Update invoice balances
    const { data: updatedInvoice, error: updateErr } = await supabaseService
      .from('invoices')
      .update({
        amount_paid: newPaid,
        balance_due: newBalanceDue,
      })
      .eq('id', invoice.id)
      .select(`
        *,
        customers ( id, customer_name, phone_number, email, address, gstin )
      `)
      .single()

    if (updateErr) throw updateErr

    // 3. Fetch all updated payment slots
    const { data: allPayments } = await supabaseService
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('payment_date', { ascending: true })

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${finalCollection.toFixed(2)} recorded successfully!`,
      invoice: updatedInvoice,
      payments: allPayments || [],
      new_amount_paid: newPaid,
      new_balance_due: newBalanceDue,
    }, { status: 201 })
  } catch (error: any) {
    console.error("Payment slot collection error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}
