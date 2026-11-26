'use client'

import { Receipt, Printer } from 'lucide-react'
import { printTaxInvoice } from '@/lib/invoicePrinter'

export function PrintServiceInvoiceButton({ invoice }: { invoice: any }) {
  if (!invoice) return null

  return (
    <button
      type="button"
      onClick={() => printTaxInvoice(invoice)}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      <span>Print Service Bill ({invoice.invoice_number})</span>
    </button>
  )
}
