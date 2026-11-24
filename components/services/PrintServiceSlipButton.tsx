'use client'

import { Printer } from 'lucide-react'
import { printDualServiceSlip } from '@/lib/serviceSlipPrinter'

export function PrintServiceSlipButton({ service }: { service: any }) {
  return (
    <button
      type="button"
      onClick={() => printDualServiceSlip(service)}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
    >
      <Printer className="w-4 h-4 text-orange-600" />
      <span>Print Dual Service Slip</span>
    </button>
  )
}
