'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle2,
  PlusCircle,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'
import { printTaxInvoice } from '@/lib/invoicePrinter'
import { PaymentCollectionModal } from '@/components/billing/PaymentCollectionModal'
import { TaxInvoicePaperView } from '@/components/billing/TaxInvoicePaperView'
import { ShareModal } from '@/components/common/ShareModal'

export function InvoiceDetailView({ invoice }: { invoice: any }) {
  const [inv, setInv] = useState(invoice)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  const fetchPayments = async () => {
    if (!inv?.id) return
    setLoadingPayments(true)
    try {
      const res = await fetch(`/api/billing/${inv.id}/payments`)
      if (res.ok) {
        const data = await res.json()
        if (data.payments) setPayments(data.payments)
        if (data.invoice) setInv((prev: any) => ({ ...prev, ...data.invoice }))
      }
    } catch (e) {
      console.warn('Error loading payments:', e)
    } finally {
      setLoadingPayments(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [inv?.id])

  const grandTotal = parseFloat(inv.total_grand_amount || inv.grand_total || 0)
  const amountPaid = parseFloat(inv.amount_paid !== undefined ? inv.amount_paid : grandTotal)
  const balanceDue = parseFloat(
    inv.balance_due !== undefined ? inv.balance_due : Math.max(0, grandTotal - amountPaid).toString()
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>
        <div className="flex items-center gap-3">
          {balanceDue > 0 && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer animate-pulse"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Collect Due ({formatCurrency(balanceDue)})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => printTaxInvoice(inv)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-xs cursor-pointer"
            title="Share via WhatsApp or Email"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Render the Exact Tax Invoice Paper View */}
      <TaxInvoicePaperView invoice={inv} />

      {/* Payment Slots / Installments Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm print:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Payment History &amp; Installment Slots ({payments.length})
            </h3>
          </div>
          {balanceDue > 0 ? (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Collect Payment Slot</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled in Full</span>
            </span>
          )}
        </div>

        {loadingPayments ? (
          <div className="p-4 text-center text-xs text-slate-400 animate-pulse">Loading payment records...</div>
        ) : payments.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 text-center">
            No partial installment records found. (Recorded initial payment: {formatCurrency(amountPaid)} via {inv.payment_method || 'Cash'})
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 pl-3">Slot #</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Payment Method</th>
                  <th className="p-2.5">Ref / Notes</th>
                  <th className="p-2.5 pr-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/50">
                    <td className="p-2.5 pl-3 font-mono font-semibold text-slate-500">Slot #{idx + 1}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-2.5 font-medium">{p.payment_method || 'Cash'}</td>
                    <td className="p-2.5 text-slate-500 font-mono text-[11px]">{p.transaction_ref || '-'}</td>
                    <td className="p-2.5 pr-3 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Collection Modal */}
      <PaymentCollectionModal
        invoice={inv}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={(updated) => {
          setInv(updated)
          fetchPayments()
        }}
      />

      {/* Share Modal (WhatsApp & Email) */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        data={{
          title: `Tax Invoice #${inv?.invoice_number || ''}`,
          documentType: 'invoice',
          documentNumber: inv?.invoice_number,
          recipientName:
            inv?.customer?.customer_name ||
            inv?.customers?.customer_name ||
            inv?.invoice_snapshot?.customer?.customer_name ||
            'Customer',
          recipientPhone:
            inv?.customer?.phone_number ||
            inv?.customers?.phone_number ||
            inv?.invoice_snapshot?.customer?.phone_number ||
            '',
          recipientEmail:
            inv?.customer?.email ||
            inv?.customers?.email ||
            inv?.invoice_snapshot?.customer?.email ||
            '',
          grandTotal,
          balanceDue,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
    </div>
  )
}
