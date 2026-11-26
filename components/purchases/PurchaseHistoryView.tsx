'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Building2,
  Phone,
  Calendar,
  ExternalLink,
  Plus,
  Receipt,
  X,
  CreditCard,
  Package,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

export interface PurchaseReceiptItem {
  id: string
  receipt_number: string
  receipt_date: string
  status: string
  supplier_id?: string
  suppliers?: {
    id?: string
    name?: string
    phone?: string | null
    contact_email?: string | null
    gstin?: string | null
    address?: string | null
  } | null
  purchase_receipt_items?: Array<{
    quantity: number
    purchase_price: number
    gst_rate: number
    products?: { name: string } | null
  }>
  total_amount?: number
}

export function PurchaseHistoryView({
  initialReceipts = [],
  suppliers = [],
}: {
  initialReceipts: any[]
  suppliers?: any[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null)
  const [showSupplierModal, setShowSupplierModal] = useState(false)

  // Normalize receipts with computed totals and supplier phone
  const receipts = useMemo(() => {
    return initialReceipts.map((r) => {
      const items = Array.isArray(r.purchase_receipt_items) ? r.purchase_receipt_items : []
      const calcTotal = items.reduce((sum: number, it: any) => {
        const qty = parseFloat(it?.quantity) || 1
        const price = parseFloat(it?.purchase_price) || 0
        return sum + qty * price
      }, 0)

      // Resolve supplier phone & details
      let phone = r.suppliers?.phone || ''
      let gstin = r.suppliers?.gstin || ''
      let address = r.suppliers?.address || ''
      const email = r.suppliers?.contact_email || ''

      if (email && email.trim().startsWith('{') && email.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(email)
          gstin = gstin || parsed.gstin || ''
          address = address || parsed.address || ''
        } catch {}
      }

      // Also check suppliers list if matched by name
      const matchedSup = suppliers.find(
        (s) => s.name?.toLowerCase() === r.suppliers?.name?.toLowerCase()
      )
      if (matchedSup) {
        phone = phone || matchedSup.phone || ''
        gstin = gstin || matchedSup.gstin || ''
        address = address || matchedSup.address || ''
      }

      return {
        ...r,
        supplierName: r.suppliers?.name || 'Unknown Supplier',
        supplierPhone: phone,
        supplierGstin: gstin,
        supplierAddress: address,
        itemsCount: items.length,
        totalAmount: r.total_amount || calcTotal,
      }
    })
  }, [initialReceipts, suppliers])

  // Filter receipts by Company Name OR Phone Number OR Bill Number
  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return receipts

    return receipts.filter((r) => {
      const nameMatch = r.supplierName?.toLowerCase().includes(q)
      const phoneMatch = r.supplierPhone?.toLowerCase().includes(q)
      const numberMatch = r.receipt_number?.toLowerCase().includes(q)
      return nameMatch || phoneMatch || numberMatch
    })
  }, [receipts, searchQuery])

  // Open Company History Modal
  const handleOpenCompanyHistory = (supplierName: string) => {
    const matchingBills = receipts.filter(
      (r) => r.supplierName?.toLowerCase() === supplierName.toLowerCase()
    )
    const firstBill = matchingBills[0]
    const matchedSup = suppliers.find(
      (s) => s.name?.toLowerCase() === supplierName.toLowerCase()
    )

    const totalPaid = matchingBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0)

    setSelectedSupplier({
      name: supplierName,
      phone: firstBill?.supplierPhone || matchedSup?.phone || 'Not available',
      gstin: firstBill?.supplierGstin || matchedSup?.gstin || 'Not available',
      address: firstBill?.supplierAddress || matchedSup?.address || '',
      bills: matchingBills,
      totalPaid,
    })
    setShowSupplierModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Search Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <span>Purchase Inward & Bill History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search purchases by company name or phone number. Click any company to view paid bill history.
            </p>
          </div>
          <Link
            href="/dashboard/purchases"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Bill</span>
          </Link>
        </div>

        {/* Live Search Inputs */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Company / Supplier Name, Phone Number or Bill #..."
            className="w-full pl-10 pr-24 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results Count & Badges */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <b>{filteredReceipts.length}</b> of <b>{receipts.length}</b> purchase receipts
          </span>
          {searchQuery && (
            <span className="text-primary font-medium">
              Filtered by: &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs overflow-hidden">
        {filteredReceipts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {searchQuery
              ? `No purchase receipts found matching "${searchQuery}".`
              : 'No purchase receipts recorded yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Receipt / Bill #</th>
                  <th className="py-3 px-3">Supplier / Company Name</th>
                  <th className="py-3 px-3">Phone Number</th>
                  <th className="py-3 px-3">Bill Date</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReceipts.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {r.receipt_number}
                    </td>

                    {/* Company Name with Clickable History Trigger */}
                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleOpenCompanyHistory(r.supplierName)}
                        className="group text-left flex items-center gap-1.5 hover:text-primary transition"
                        title="Click to view all bills and payment history for this company"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition" />
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary group-hover:underline">
                          {r.supplierName}
                        </span>
                        <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded font-medium ml-1">
                          View History
                        </span>
                      </button>
                    </td>

                    {/* Phone Number */}
                    <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {r.supplierPhone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{r.supplierPhone}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 text-slate-500">
                      {new Date(r.receipt_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-3 text-center font-semibold">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {r.itemsCount} items
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(r.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{r.status || 'RECEIVED'}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={`/dashboard/purchases/${r.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition"
                      >
                        <span>Invoice</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Company Billing & Purchase History Modal */}
      {showSupplierModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowSupplierModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[11px] font-bold mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>COMPANY BILLING & PURCHASE HISTORY</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedSupplier.name}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <b>Phone:</b> {selectedSupplier.phone}
                  </span>
                  <span>
                    <b>GSTIN:</b> {selectedSupplier.gstin}
                  </span>
                  {selectedSupplier.address && (
                    <span>
                      <b>Address:</b> {selectedSupplier.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total Spending Stat Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                  Total Bills Inward
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedSupplier.bills.length} Bills
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                  Total Purchases Paid
                </span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(selectedSupplier.totalPaid)}
                </span>
              </div>
            </div>

            {/* List of Bills for this Company */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                All Recorded Inward Bills from {selectedSupplier.name}
              </h4>
              <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 sticky top-0">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Receipt / Bill #</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedSupplier.bills.map((bill: any) => (
                      <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(bill.receipt_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {bill.receipt_number}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {bill.itemsCount} items
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(bill.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            PAID
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/dashboard/purchases/${bill.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          >
                            <span>Invoice</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
