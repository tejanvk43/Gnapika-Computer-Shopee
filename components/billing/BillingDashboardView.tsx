'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Plus,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  PlusCircle,
  CreditCard,
  Banknote,
  DollarSign,
  TrendingUp,
  Share2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { PaymentCollectionModal } from '@/components/billing/PaymentCollectionModal'
import { ShareModal } from '@/components/common/ShareModal'

interface BillingDashboardViewProps {
  initialInvoices: any[]
}

export function BillingDashboardView({ initialInvoices }: BillingDashboardViewProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL')
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null)
  const [invoiceToShare, setInvoiceToShare] = useState<any | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Overall KPI metrics
  const totalInvoicesCount = invoices.length
  const totalSalesAmount = invoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.total_grand_amount || '0') || 0),
    0
  )
  const totalCollectedAmount = invoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.amount_paid || '0') || 0),
    0
  )
  const totalOutstandingDue = invoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.balance_due || '0') || 0),
    0
  )
  const dueInvoicesCount = invoices.filter(
    (inv) => parseFloat(inv.balance_due || '0') > 0
  ).length
  const paidInvoicesCount = totalInvoicesCount - dueInvoicesCount

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const due = parseFloat(inv.balance_due || '0')
    const isPaid = due <= 0

    // Filter by tab
    if (statusFilter === 'DUE' && isPaid) return false
    if (statusFilter === 'PAID' && !isPaid) return false

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      const matchInv = inv.invoice_number?.toLowerCase().includes(q)
      const matchCust = inv.customers?.customer_name?.toLowerCase().includes(q)
      const matchPhone = inv.customers?.phone_number?.toLowerCase().includes(q)
      return matchInv || matchCust || matchPhone
    }

    return true
  })

  const handleOpenPayment = (invoice: any) => {
    setSelectedInvoiceForPayment(invoice)
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSuccess = (updatedInvoice: any) => {
    setInvoices((prev) =>
      prev.map((item) => (item.id === updatedInvoice.id ? { ...item, ...updatedInvoice } : item))
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Point of Sale & Invoices</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Billing & Outstanding Dues
          </h1>
          <p className="text-sm text-slate-500">
            Track bill-wise sales, collect multiple installment slots, and monitor customer due balances.
          </p>
        </div>

        <Link
          href="/dashboard/billing/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Sale &amp; Bill</span>
        </Link>
      </div>

      {/* KPI Cards: Total Sales, Total Collected, Total Outstanding Dues, Due Invoices */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalSalesAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {totalInvoicesCount} invoices</div>
        </div>

        {/* Total Collected */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Collected</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalCollectedAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{paidInvoicesCount} settled in full</div>
        </div>

        {/* Total Outstanding Dues */}
        <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Outstanding Dues</span>
            </span>
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-300 mt-1">
            {formatCurrency(totalOutstandingDue)}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
            Pending across {dueInvoicesCount} bills
          </div>
        </div>

        {/* Due Bills Count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Bills</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
            {dueInvoicesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {dueInvoicesCount > 0 ? 'Click "+ Collect" to add slot' : 'All clear!'}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Bills ({totalInvoicesCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DUE')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              statusFilter === 'DUE'
                ? 'bg-rose-500 text-white shadow-xs font-bold'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
            }`}
          >
            <span>Due Bills ({dueInvoicesCount})</span>
            {dueInvoicesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
            }`}
          >
            Fully Paid ({paidInvoicesCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Bill #, Customer or Phone..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Bill-Wise Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Invoice #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Balance Due</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No invoices matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice: any) => {
                  const grandTotal = parseFloat(invoice.total_grand_amount || '0')
                  const paid = parseFloat(invoice.amount_paid !== undefined ? invoice.amount_paid : grandTotal)
                  const balanceDue = parseFloat(
                    invoice.balance_due !== undefined ? invoice.balance_due : Math.max(0, grandTotal - paid).toString()
                  )
                  const isPaid = balanceDue <= 0
                  const isPartial = !isPaid && paid > 0

                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 pl-6 font-mono font-bold text-xs text-slate-900 dark:text-white">
                        <Link
                          href={`/dashboard/billing/${invoice.id}`}
                          className="hover:text-primary transition"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        <div>{invoice.customers?.customer_name || 'Walk-in Customer'}</div>
                        {invoice.customers?.phone_number && (
                          <div className="text-xs font-normal text-slate-500 font-mono">
                            {invoice.customers.phone_number}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                          {invoice.invoice_items?.length || invoice.invoice_snapshot?.items?.length || 0} items
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(grandTotal)}
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-emerald-600">
                        {formatCurrency(paid)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold">
                        {balanceDue > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-black">
                            {formatCurrency(balanceDue)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">₹0.00</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Partial Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {balanceDue > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(invoice)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Collect</span>
                            </button>
                          )}
                          <Link
                            href={`/dashboard/billing/${invoice.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 transition"
                            title="View invoice"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>View</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setInvoiceToShare(invoice)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            title="Share invoice via WhatsApp or Email"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Share</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Collection Modal */}
      <PaymentCollectionModal
        invoice={selectedInvoiceForPayment}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setSelectedInvoiceForPayment(null)
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Share Modal (WhatsApp & Email) */}
      <ShareModal
        isOpen={!!invoiceToShare}
        onClose={() => setInvoiceToShare(null)}
        data={
          invoiceToShare
            ? {
                title: `Tax Invoice #${invoiceToShare.invoice_number || ''}`,
                documentType: 'invoice',
                documentNumber: invoiceToShare.invoice_number,
                recipientName:
                  invoiceToShare.customers?.customer_name ||
                  invoiceToShare.customer?.customer_name ||
                  'Customer',
                recipientPhone:
                  invoiceToShare.customers?.phone_number ||
                  invoiceToShare.customer?.phone_number ||
                  '',
                recipientEmail:
                  invoiceToShare.customers?.email ||
                  invoiceToShare.customer?.email ||
                  '',
                grandTotal: parseFloat(invoiceToShare.total_grand_amount || 0),
                balanceDue: parseFloat(invoiceToShare.balance_due || 0),
                url:
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/dashboard/billing/${invoiceToShare.id}`
                    : undefined,
              }
            : null
        }
      />
    </div>
  )
}
