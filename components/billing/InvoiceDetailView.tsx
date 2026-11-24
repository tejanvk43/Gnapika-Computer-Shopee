'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from '@/lib/formatters'
import { printTaxInvoice } from '@/lib/invoicePrinter'

export function InvoiceDetailView({ invoice }: { invoice: any }) {
  const isPaid = parseFloat(invoice.balance_due || 0) <= 0
  const grandTotal = parseFloat(invoice.total_grand_amount || 0)

  // Calculate items and tax
  const items = invoice.invoice_items && invoice.invoice_items.length > 0
    ? invoice.invoice_items
    : invoice.invoice_snapshot?.items || []

  const subtotal = invoice.invoice_snapshot?.subtotal
    ? parseFloat(invoice.invoice_snapshot.subtotal)
    : items.reduce((sum: number, it: any) => sum + (parseFloat(it.taxable_amount || it.line_total) || 0), 0) || (grandTotal / 1.18)

  const gstAmount = invoice.invoice_snapshot?.gst_amount
    ? parseFloat(invoice.invoice_snapshot.gst_amount)
    : (grandTotal - subtotal)

  const cgstAmount = gstAmount / 2
  const sgstAmount = gstAmount / 2

  const customerName = invoice.customers?.customer_name || invoice.invoice_snapshot?.customer?.customer_name || 'Counter Sale / Walk-in Customer'
  const customerPhone = invoice.customers?.phone_number || invoice.invoice_snapshot?.customer?.phone_number || '-'
  const customerAltPhone = invoice.customers?.alt_phone_number || invoice.invoice_snapshot?.customer?.alt_phone_number || ''
  const customerAddress = invoice.customers?.address || invoice.invoice_snapshot?.customer?.address || ''
  const customerGstin = invoice.customers?.gstin || invoice.invoice_snapshot?.customer?.gstin || ''

  const invoiceDate = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN')

  const invoiceTime = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

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
          <button
            type="button"
            onClick={() => printTaxInvoice(invoice)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Tax Invoice</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Invoice link copied to clipboard!')
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Main Printable Invoice Sheet */}
      <div
        id="tax-invoice-sheet"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-lg text-slate-800 dark:text-slate-100 print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black"
      >
        {/* Top Header & Branding */}
        <div className="border-b-2 border-slate-900/10 dark:border-slate-700 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            {/* Shop Brand Left */}
            <div className="space-y-1 max-w-lg">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-black tracking-widest uppercase bg-primary text-white">
                  TAX INVOICE
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Original for Recipient
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight uppercase">
                {SHOP_DETAILS.name}
              </h1>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {SHOP_DETAILS.tagline}
              </p>
              <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{SHOP_DETAILS.address}, {SHOP_DETAILS.city}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{SHOP_DETAILS.phone}</span>
                  <span className="mx-1">|</span>
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{SHOP_DETAILS.email}</span>
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  GSTIN: <span className="font-mono">{SHOP_DETAILS.gstin}</span> | State: {SHOP_DETAILS.state} ({SHOP_DETAILS.stateCode})
                </p>
              </div>
            </div>

            {/* Invoice Meta Right */}
            <div className="sm:text-right bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 min-w-[240px] space-y-2 print:bg-slate-50 print:border print:border-slate-300">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Invoice Number
                </span>
                <span className="text-base font-black font-mono text-primary">
                  {invoice.invoice_number}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-200 dark:border-slate-700 pt-2 text-left sm:text-right">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Date & Time:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {invoiceDate} {invoiceTime}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Payment Mode:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{invoice.payment_method || 'Cash'}</span>
                </div>
              </div>
              <div className="pt-1">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isPaid ? 'PAYMENT RECEIVED' : 'BALANCE DUE'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Billed To / Customer Details Box */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-xs">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed To (Customer Details):
              </span>
              <p className="text-sm font-black text-slate-950 dark:text-white">
                {customerName}
              </p>
              <div className="mt-1 text-slate-600 dark:text-slate-300 space-y-0.5">
                <p>Phone: <span className="font-semibold">{customerPhone}</span> {customerAltPhone && ` / ${customerAltPhone}`}</p>
                {customerAddress && <p>Address: {customerAddress}</p>}
              </div>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Tax Identification:
              </span>
              <p className="font-mono text-slate-800 dark:text-slate-200">
                GSTIN: <span className="font-bold">{customerGstin || 'Unregistered / Consumer'}</span>
              </p>
              <p className="text-slate-500 mt-1">Place of Supply: Andhra Pradesh (37)</p>
            </div>
          </div>
        </div>

        {/* Itemized Invoice Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">HSN/SKU</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-right">Taxable Val</th>
                <th className="py-2.5 px-3 text-right">GST (18%)</th>
                <th className="py-2.5 px-3 text-right">Total (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items && items.length > 0 ? (
                items.map((it: any, i: number) => {
                  const name = it.products?.name || it.name || 'Sales Item'
                  const sku = it.products?.sku || it.sku || '-'
                  const qty = parseFloat(it.quantity) || 1
                  const unitPrice = parseFloat(it.unit_price_snapshot || it.unit_price || 0)
                  const discount = parseFloat(it.discount_applied || it.discount || 0)
                  const taxable = parseFloat(it.taxable_amount) || Math.max(0, (unitPrice * qty) - discount)
                  const gstRate = parseFloat(it.gst_rate_snapshot || 18)
                  const itemGst = (taxable * gstRate) / 100
                  const lineTotalWithTax = taxable + itemGst

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{i + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{name}</div>
                        {it.products?.description && (
                          <div className="text-[10px] text-slate-500 line-clamp-1">{it.products.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">{sku}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{qty}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(unitPrice)}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">{formatCurrency(taxable)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {gstRate}%
                        <span className="block text-[10px] text-slate-400">({formatCurrency(itemGst)})</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-950 dark:text-white">
                        {formatCurrency(lineTotalWithTax)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="py-3 px-3 text-center font-mono">1</td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">General Products / Hardware</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">8471</td>
                  <td className="py-3 px-3 text-center font-mono font-bold">1</td>
                  <td className="py-3 px-3 text-right font-mono">{formatCurrency(subtotal)}</td>
                  <td className="py-3 px-3 text-right font-mono">{formatCurrency(subtotal)}</td>
                  <td className="py-3 px-3 text-right font-mono">18%</td>
                  <td className="py-3 px-3 text-right font-mono font-bold">{formatCurrency(subtotal)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Calculation & Tax Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800">
          {/* Left: Amount In Words & Bank Details */}
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Amount Chargeable (in words):
              </span>
              <p className="font-bold text-slate-900 dark:text-white italic">
                {numberToWordsRupees(grandTotal)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Bank & Payment Details:
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                Bank: <span className="font-semibold">{SHOP_DETAILS.bankDetails.bankName}</span>
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                Account Name: <span className="font-semibold">{SHOP_DETAILS.bankDetails.accountName}</span>
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                A/C No: <span className="font-mono font-bold">{SHOP_DETAILS.bankDetails.accountNo}</span> | IFSC: <span className="font-mono font-bold">{SHOP_DETAILS.bankDetails.ifsc}</span>
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                UPI ID: <span className="font-mono font-semibold text-primary">{SHOP_DETAILS.bankDetails.upiId}</span>
              </p>
            </div>
          </div>

          {/* Right: Calculations */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Subtotal (Taxable Value):</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Central GST (CGST 9%):</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(cgstAmount)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>State GST (SGST 9%):</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(sgstAmount)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Total Tax (18% GST):</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(gstAmount)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-slate-900 dark:border-slate-700 text-base font-black text-slate-950 dark:text-white">
              <span>Grand Total:</span>
              <span className="font-mono text-primary text-xl font-black">
                {formatCurrency(grandTotal)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400 text-xs">
              <span>Amount Paid:</span>
              <span className="font-mono font-semibold text-emerald-600">
                {formatCurrency(invoice.amount_paid || grandTotal)}
              </span>
            </div>
            {parseFloat(invoice.balance_due || 0) > 0 && (
              <div className="flex justify-between py-1 text-rose-600 font-bold text-xs">
                <span>Balance Due:</span>
                <span className="font-mono">{formatCurrency(invoice.balance_due)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms & Conditions + Signatures */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] text-slate-500">
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              Terms & Conditions:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>Goods once sold will not be accepted back or exchanged after 7 days.</li>
              <li>Warranty is covered directly by the respective manufacturer/brand service centers.</li>
              <li>Physical damage, burnt ICs, track cuts, or liquid spillages are not covered under warranty.</li>
              <li>Subject to Vijayawada jurisdiction only.</li>
            </ol>
          </div>

          <div className="flex flex-col justify-between items-end text-right min-h-[100px]">
            <div className="text-right">
              <p className="font-bold text-slate-900 dark:text-white text-xs">
                For {SHOP_DETAILS.name}
              </p>
              <p className="text-[10px] text-slate-400">Authorized Signatory / Cashier</p>
            </div>
            <div className="w-48 border-b-2 border-dashed border-slate-400 dark:border-slate-600 pb-1 text-center text-[10px] text-slate-400">
              Signature & Stamp
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-[11px] font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-3">
          Thank you for choosing {SHOP_DETAILS.name}! For queries, call {SHOP_DETAILS.phone}
        </div>
      </div>
    </div>
  )
}
