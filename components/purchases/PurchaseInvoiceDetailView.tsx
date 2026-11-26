// components/purchases/PurchaseInvoiceDetailView.tsx
'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  Share2,
  Building2,
  Calendar,
  Hash,
  Phone,
  MapPin,
  Barcode,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from '@/lib/formatters'
import { printPurchaseInvoice } from '@/lib/purchaseInvoicePrinter'

export function PurchaseInvoiceDetailView({ purchase }: { purchase: any }) {
  const snapshot = purchase.invoice_snapshot || purchase
  const supplier = snapshot.supplier || purchase.suppliers || {}
  const items = snapshot.items || purchase.purchase_receipt_items || []
  const totals = snapshot.totals || {}

  const invoiceNumber = snapshot.invoice_number || purchase.receipt_number || 'PUR-000000'
  const dateStr = snapshot.receipt_date || purchase.receipt_date || new Date().toISOString()
  const invoiceDate = new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const supplierName = supplier.name || 'Vendor'
  const supplierPhone = supplier.phone || '-'
  const supplierGstin = supplier.gstin || purchase.supplier_gstin || '-'
  const supplierAddress = supplier.address || purchase.supplier_address || '-'

  const taxableTotal = parseFloat(totals.taxable_total || totals.gross_total || 0)
  const cgstTotal = parseFloat(totals.cgst_total || 0)
  const sgstTotal = parseFloat(totals.sgst_total || 0)
  const igstTotal = parseFloat(totals.igst_total || 0)
  const grandTotal = parseFloat(
    totals.grand_total || taxableTotal + cgstTotal + sgstTotal + igstTotal
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          href="/dashboard/purchases"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchases</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => printPurchaseInvoice(purchase)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Purchase Bill</span>
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(window.location.href)
                toast.success('Purchase invoice link copied to clipboard!')
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Main Printable Purchase Invoice Sheet */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-lg text-slate-800 dark:text-slate-100 print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
        {/* Brand & Inward Header */}
        <div className="border-b-2 border-slate-900/10 dark:border-slate-700 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Goods Receipt & Purchase Invoice
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Received
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
                {SHOP_DETAILS.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                {SHOP_DETAILS.tagline}
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>{SHOP_DETAILS.address}, {SHOP_DETAILS.city}</span>
                <span>Phone: <b>{SHOP_DETAILS.phone}</b></span>
                <span>GSTIN: <b>{SHOP_DETAILS.gstin}</b></span>
              </div>
            </div>

            <div className="sm:text-right bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Purchase Bill No.</div>
              <div className="text-lg sm:text-xl font-extrabold text-primary font-mono mt-0.5">
                {invoiceNumber}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center sm:justify-end gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date: <b>{invoiceDate}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier / Vendor Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Supplier / Vendor Details</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {supplierName}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-1">
              <div><b>GSTIN:</b> {supplierGstin}</div>
              <div><b>Phone:</b> {supplierPhone}</div>
              {supplierAddress && <div><b>Address:</b> {supplierAddress}</div>}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stock Inward Meta</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div><b>Receiving Branch:</b> Gnapika Computer Shopee - Main Store</div>
              <div><b>Inventory Status:</b> Added to active branch stock</div>
              <div><b>Total Line Items:</b> {items.length}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 dark:border-slate-700 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3">Item Description & Serial Numbers</th>
                <th className="py-2.5 px-3 text-center">HSN</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Taxable</th>
                <th className="py-2.5 px-3 text-right">CGST</th>
                <th className="py-2.5 px-3 text-right">SGST</th>
                <th className="py-2.5 px-3 text-right">IGST</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {items.map((item: any, idx: number) => {
                const pName = item.product_name || item.products?.name || item.name || 'Product'
                const hsn = item.hsn_code || '8471'
                const qty = parseFloat(item.quantity) || 1
                const rate = parseFloat(item.rate || item.purchase_price) || 0
                const taxable = parseFloat(item.taxable_amount || (qty * rate))
                const cgstAmt = parseFloat(item.cgst_amount || 0)
                const sgstAmt = parseFloat(item.sgst_amount || 0)
                const igstAmt = parseFloat(item.igst_amount || 0)
                const lineTotal = parseFloat(item.total_amount || (taxable + cgstAmt + sgstAmt + igstAmt))
                const serials = Array.isArray(item.serial_numbers) ? item.serial_numbers : []

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{pName}</div>
                      {serials.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {serials.map((s: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                            >
                              <Barcode className="w-2.5 h-2.5 text-primary" />
                              <span>{s}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500 font-mono text-xs">{hsn}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">{qty}</td>
                    <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(rate)}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(taxable)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">{formatCurrency(cgstAmt)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">{formatCurrency(sgstAmt)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">{formatCurrency(igstAmt)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-t-2 border-slate-200 dark:border-slate-700 pt-4 flex flex-col sm:flex-row justify-between gap-6">
          <div className="max-w-md">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Amount In Words
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              {numberToWordsRupees(grandTotal)}
            </div>
          </div>

          <div className="w-full sm:w-80 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Taxable Subtotal:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(taxableTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>CGST Total:</span>
              <span>{formatCurrency(cgstTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>SGST Total:</span>
              <span>{formatCurrency(sgstTotal)}</span>
            </div>
            {igstTotal > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>IGST Total:</span>
                <span>{formatCurrency(igstTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t-2 border-slate-900 dark:border-slate-600">
              <span>Net Purchase Total:</span>
              <span className="text-primary">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
