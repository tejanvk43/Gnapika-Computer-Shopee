'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Receipt,
  Printer,
  CheckCircle2,
  DollarSign,
  CreditCard,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { printTaxInvoice } from '@/lib/invoicePrinter'
import { formatCurrency } from '@/lib/formatters'

interface ServiceBillingCardProps {
  service: any
  initialInvoice?: any | null
}

export function ServiceBillingCard({
  service,
  initialInvoice = null,
}: ServiceBillingCardProps) {
  const router = useRouter()
  const [invoice, setInvoice] = useState<any | null>(initialInvoice)

  // Form states for generating bill
  const defaultCost = parseFloat(service.estimated_cost) || 0
  const [actualCost, setActualCost] = useState<number | string>(defaultCost > 0 ? defaultCost : '')
  const [paymentMode, setPaymentMode] = useState<'full' | 'partial' | 'credit'>('full')
  const [amountPaidNow, setAmountPaidNow] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [description, setDescription] = useState(
    `Service & Repair Charges: ${service.company_brand || ''} ${service.model || ''} (${service.device_type || 'Device'})`.trim()
  )
  const [workNotes, setWorkNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Live tax calculations
  const numActualTaxable = Math.max(0, parseFloat(actualCost as any) || 0)
  const cgstAmount = Math.round(numActualTaxable * 0.09 * 100) / 100
  const sgstAmount = Math.round(numActualTaxable * 0.09 * 100) / 100
  const totalGst = Math.round((cgstAmount + sgstAmount) * 100) / 100
  const grandTotal = Math.round((numActualTaxable + totalGst) * 100) / 100

  const effectiveAmountPaid = paymentMode === 'full'
    ? grandTotal
    : paymentMode === 'credit'
    ? 0
    : Math.min(grandTotal, Math.max(0, parseFloat(amountPaidNow) || 0))
  const balanceDue = Math.max(0, Math.round((grandTotal - effectiveAmountPaid) * 100) / 100)

  // Handle Bill Generation
  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (numActualTaxable <= 0) {
      toast.error('Please enter the actual amount taken for this service.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/services/${service.id}/generate-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_cost: numActualTaxable,
          payment_method: paymentMethod,
          payment_mode: paymentMode,
          amount_paid: effectiveAmountPaid,
          description: description.trim(),
          work_notes: workNotes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate service bill')
      }

      toast.success(`Service Bill Generated: ${data.invoice_number}`)
      setInvoice(data.invoice)

      // Automatically open print dialog for service invoice
      try {
        printTaxInvoice(data.invoice)
      } catch (pErr) {
        console.warn('Auto print notice:', pErr)
      }

      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating service bill')
    } finally {
      setLoading(false)
    }
  }

  // Handle printing existing bill
  const handlePrintExistingBill = () => {
    if (!invoice) return
    try {
      printTaxInvoice(invoice)
    } catch (err: any) {
      toast.error('Failed to launch invoice printer: ' + (err.message || ''))
    }
  }

  // If Bill is ALREADY Generated, show summary and print button
  if (invoice) {
    const invSnapshot = invoice.invoice_snapshot || {}
    const billedTaxable = parseFloat(invSnapshot.actual_cost || invSnapshot.subtotal || invoice.total_grand_amount / 1.18 || 0)
    const billedGrandTotal = parseFloat(invoice.total_grand_amount || invSnapshot.grand_total || 0)
    const billedPaid = parseFloat(invoice.amount_paid !== undefined ? invoice.amount_paid : invSnapshot.amount_paid || 0)
    const billedDue = parseFloat(invoice.balance_due !== undefined ? invoice.balance_due : invSnapshot.balance_due || 0)

    return (
      <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Service Bill Generated
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {invoice.invoice_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Billed on {new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrintExistingBill}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Service Bill</span>
          </button>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400 block mb-0.5">Taxable Service:</span>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
              ₹{billedTaxable.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400 block mb-0.5">Total with 18% GST:</span>
            <p className="font-mono font-black text-slate-900 dark:text-white text-sm">
              ₹{billedGrandTotal.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400 block mb-0.5">Payment Received:</span>
            <p className="font-mono font-bold text-emerald-600 text-sm">
              ₹{billedPaid.toFixed(2)}
            </p>
            <span className="text-[10px] text-slate-400 font-mono">({invoice.payment_method})</span>
          </div>
          <div className={`p-3 rounded-xl ${billedDue > 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
            <span className="text-slate-400 block mb-0.5">Balance Outstanding:</span>
            <p className={`font-mono font-bold text-sm ${billedDue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              ₹{billedDue.toFixed(2)}
            </p>
            <span className={`text-[10px] font-bold ${billedDue > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              {billedDue > 0 ? 'Due / Credit' : 'Fully Cleared'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // If Bill NOT yet generated: Form to enter actual amount taken and generate bill
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Service Completion &amp; Bill Generation
            </h3>
            <p className="text-xs text-slate-400">
              Enter the actual amount taken from the customer to generate the final GST Service Bill.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
          Format: GCS-SER{new Date().getFullYear().toString().slice(-2)}-...
        </span>
      </div>

      <form onSubmit={handleGenerateBill} className="space-y-4">
        {/* Actual Amount Taken Input (Taxable Rate) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-6">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Actual Amount Taken / Service Charge (Taxable ₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono font-bold text-base text-slate-900 dark:text-white"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Amount entered is the <strong>taxable amount</strong>. 18% GST (9% CGST + 9% SGST) will be added on top.
            </p>
          </div>

          {/* Live Tax Calculation Summary Box */}
          <div className="sm:col-span-6 p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/60 text-xs space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Taxable Charge:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                ₹{numActualTaxable.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>CGST (9%) + SGST (9%):</span>
              <span className="font-mono">+₹{totalGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1.5 border-t border-orange-200/80 dark:border-orange-900/60 font-bold">
              <span className="text-slate-900 dark:text-white text-xs uppercase tracking-wide">Net Bill Amount:</span>
              <span className="text-lg font-black font-mono text-orange-600">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Settlement
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMode('full')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  paymentMode === 'full'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Full
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('partial')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  paymentMode === 'partial'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Partial
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('credit')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  paymentMode === 'credit'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Due
              </button>
            </div>
          </div>

          {/* Amount Paid Now (if partial) */}
          {paymentMode === 'partial' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount Paid Now (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  step="0.01"
                  value={amountPaidNow}
                  onChange={(e) => setAmountPaidNow(e.target.value)}
                  placeholder={`Max ₹${grandTotal}`}
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>
              <p className="text-[10px] text-rose-500 font-mono mt-0.5">
                Balance Due: ₹{balanceDue.toFixed(2)}
              </p>
            </div>
          )}

          {/* Payment Method */}
          {paymentMode !== 'credit' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>
          )}
        </div>

        {/* Bill Item Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Bill Item Description (Printed on Invoice)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading || numActualTaxable <= 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Generating Bill &amp; Invoice...</span>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>Generate Service Bill &amp; Complete (₹{grandTotal.toFixed(2)})</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
