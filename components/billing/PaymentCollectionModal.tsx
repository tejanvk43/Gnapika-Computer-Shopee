'use client'

import { useState, useEffect } from 'react'
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Receipt,
  PlusCircle,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'

interface PaymentCollectionModalProps {
  invoice: any | null
  isOpen: boolean
  onClose: () => void
  onPaymentSuccess?: (updatedInvoice: any) => void
}

export function PaymentCollectionModal({
  invoice,
  isOpen,
  onClose,
  onPaymentSuccess,
}: PaymentCollectionModalProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash')
  const [transactionRef, setTransactionRef] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])

  // Current balance calculations
  const grandTotal = parseFloat(invoice?.total_grand_amount || '0')
  const amountPaid = parseFloat(invoice?.amount_paid || '0')
  const balanceDue = parseFloat(
    invoice?.balance_due !== undefined
      ? invoice.balance_due
      : Math.max(0, grandTotal - amountPaid).toString()
  )

  // Reset and load existing payment history when modal opens
  useEffect(() => {
    if (isOpen && invoice?.id) {
      setAmount(balanceDue > 0 ? balanceDue.toString() : '')
      setPaymentMethod('Cash')
      setTransactionRef('')
      setPaymentDate(new Date().toISOString().slice(0, 10))

      // Load payment slot history
      setLoadingHistory(true)
      fetch(`/api/billing/${invoice.id}/payments`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.payments) {
            setPaymentHistory(data.payments)
          }
        })
        .catch((err) => console.warn('Error loading payment history:', err))
        .finally(() => setLoadingHistory(false))
    }
  }, [isOpen, invoice?.id, balanceDue])

  if (!isOpen || !invoice) return null

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const payVal = parseFloat(amount)

    if (isNaN(payVal) || payVal <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (payVal > balanceDue) {
      toast.error(`Amount cannot exceed the remaining balance due of ${formatCurrency(balanceDue)}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/billing/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payVal,
          payment_method: paymentMethod,
          transaction_ref: transactionRef.trim() || undefined,
          payment_date: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment slot')
      }

      toast.success(data.message || `Collected ${formatCurrency(payVal)} successfully!`)

      if (data.payments) {
        setPaymentHistory(data.payments)
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(data.invoice)
      }

      // Close modal if fully settled
      if (data.new_balance_due <= 0) {
        toast.success(`Invoice ${invoice.invoice_number} is now fully paid!`)
        onClose()
      } else {
        // Update remaining balance in input
        setAmount(data.new_balance_due.toString())
        setTransactionRef('')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing payment')
    } finally {
      setSubmitting(false)
    }
  }

  const customerName =
    invoice.customers?.customer_name ||
    invoice.invoice_snapshot?.customer?.customer_name ||
    'Counter Customer'
  const customerPhone =
    invoice.customers?.phone_number ||
    invoice.invoice_snapshot?.customer?.phone_number ||
    '-'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Collect Due Payment</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-primary border border-indigo-200/60 dark:border-indigo-800">
                  {invoice.invoice_number}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: <strong className="text-slate-800 dark:text-slate-200">{customerName}</strong>
                {customerPhone !== '-' && ` (${customerPhone})`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Due Balances Summary Card */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Grand Total</span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                {formatCurrency(grandTotal)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase block">Total Paid</span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {formatCurrency(amountPaid)}
              </span>
            </div>
            <div className="bg-rose-50/80 dark:bg-rose-950/40 -m-2 p-2 rounded-lg border border-rose-200 dark:border-rose-900/60">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Balance Due</span>
              <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {/* Payment Slots History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" />
                <span>Payment Installment Slots ({paymentHistory.length})</span>
              </span>
              {balanceDue <= 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fully Cleared</span>
                </span>
              )}
            </div>

            {loadingHistory ? (
              <div className="text-center py-4 text-xs text-slate-400 animate-pulse">
                Loading payment history...
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No payment slots recorded yet.
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-36 overflow-y-auto">
                {paymentHistory.map((slot, idx) => (
                  <div key={slot.id || idx} className="p-2.5 px-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[10px] flex items-center justify-center text-slate-600 dark:text-slate-400">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(slot.amount)}
                        </span>
                        <span className="text-slate-400 ml-1.5 font-medium">via {slot.payment_method || 'Cash'}</span>
                        {slot.transaction_ref && (
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {slot.transaction_ref}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {new Date(slot.payment_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Record New Payment Slot */}
          {balanceDue > 0 ? (
            <form onSubmit={handleRecordPayment} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-primary" />
                  <span>Record New Payment Slot</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAmount(balanceDue.toString())}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Pay Full Balance ({formatCurrency(balanceDue)})
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={balanceDue}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter payment amount"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'Cash', icon: Banknote },
                    { id: 'UPI', icon: QrCode },
                    { id: 'Card', icon: CreditCard },
                    { id: 'Bank Transfer', icon: Building },
                  ].map((mode) => {
                    const Icon = mode.icon
                    const isSelected = paymentMethod === mode.id
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMethod(mode.id as any)}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-semibold transition ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span>{mode.id}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Reference & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Ref / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. GPay Ref, Cheque No, Note"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !amount || parseFloat(amount) <= 0}
                className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {submitting ? (
                  <span>Recording Payment...</span>
                ) : (
                  <>
                    <span>Record Slot Payment ({formatCurrency(parseFloat(amount) || 0)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                This bill is fully settled!
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                No outstanding due amount remains for this invoice.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
