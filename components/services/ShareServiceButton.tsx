'use client'

import React, { useState } from 'react'
import { Share2 } from 'lucide-react'
import { ShareModal } from '@/components/common/ShareModal'

export function ShareServiceButton({
  service,
  invoice,
}: {
  service: any
  invoice?: any
}) {
  const [isOpen, setIsOpen] = useState(false)

  const customer = service.customers || service.customer || {}
  const docNum = service.service_ref_number || 'SRV'
  const brandModel = `${service.company_brand || ''} ${service.model || ''}`.trim()
  const grandTotal = invoice
    ? parseFloat(invoice.total_grand_amount || 0)
    : parseFloat(service.estimated_cost || 0)
  const balanceDue = invoice ? parseFloat(invoice.balance_due || 0) : undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
        title="Share Service Ticket via WhatsApp or Email"
      >
        <Share2 className="w-4 h-4 text-orange-600" />
        <span>Share</span>
      </button>

      <ShareModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        data={{
          title: `Service Ticket #${docNum} (${brandModel || 'Device'})`,
          documentType: 'service',
          documentNumber: docNum,
          recipientName: customer.customer_name || 'Customer',
          recipientPhone: customer.phone_number || '',
          recipientEmail: customer.email || '',
          grandTotal,
          balanceDue,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
    </>
  )
}
