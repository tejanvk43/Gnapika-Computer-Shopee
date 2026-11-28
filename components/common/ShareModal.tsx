'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Share2,
  Copy,
  Check,
  Mail,
  MessageCircle,
  ExternalLink,
  Smartphone,
  Send,
  Building,
  User,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { SHOP_DETAILS, formatCurrency } from '@/lib/formatters'

export interface ShareData {
  title: string
  documentType: 'invoice' | 'quotation' | 'service' | 'purchase' | 'customer' | 'general'
  documentNumber?: string
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  grandTotal?: number
  balanceDue?: number
  url?: string
  itemsSummary?: string
  customMessage?: string
}

export interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  data: ShareData | null
}

export function ShareModal({ isOpen, onClose, data }: ShareModalProps) {
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  // Compute resolved URL and initialize states whenever modal opens with data
  useEffect(() => {
    if (!isOpen || !data) return

    const resolvedUrl =
      data.url || (typeof window !== 'undefined' ? window.location.href : '')
    setShareUrl(resolvedUrl)

    const cleanPhone = (data.recipientPhone || '').replace(/\D/g, '')
    setPhone(cleanPhone.length === 10 ? cleanPhone : cleanPhone.replace(/^91/, ''))
    setEmail(data.recipientEmail || '')

    const docTypeLabel =
      data.documentType === 'invoice'
        ? 'Tax Invoice'
        : data.documentType === 'quotation'
        ? 'Quotation / Estimation'
        : data.documentType === 'service'
        ? 'Service Ticket'
        : data.documentType === 'purchase'
        ? 'Purchase Bill'
        : 'Billing Document'

    const docNum = data.documentNumber ? `#${data.documentNumber}` : ''
    const recipient = data.recipientName || 'Valued Customer'

    // Formatted Subject for Email
    setSubject(`${docTypeLabel} ${docNum} - ${SHOP_DETAILS.name}`)

    // Formatted WhatsApp Message
    let waText = ''
    if (data.customMessage) {
      waText = data.customMessage
    } else if (data.documentType === 'invoice') {
      waText =
        `*Tax Invoice from ${SHOP_DETAILS.name}*\n\n` +
        `Dear ${recipient},\n` +
        `Thank you for your business! Here are your invoice details:\n\n` +
        `📄 *Invoice No:* ${docNum}\n` +
        `💰 *Grand Total:* ${formatCurrency(data.grandTotal || 0)}\n` +
        (data.balanceDue !== undefined && data.balanceDue > 0
          ? `⚠️ *Balance Due:* ${formatCurrency(data.balanceDue)}\n`
          : `✅ *Payment Status:* Fully Paid\n`) +
        `🔗 *View Invoice Online:*\n${resolvedUrl}\n\n` +
        `For support, contact: 📞 ${SHOP_DETAILS.phone}\n` +
        `📍 ${SHOP_DETAILS.address}, ${SHOP_DETAILS.city}`
    } else if (data.documentType === 'quotation') {
      waText =
        `*Estimation / Quotation from ${SHOP_DETAILS.name}*\n\n` +
        `Dear ${recipient},\n` +
        `Please find the quotation details below:\n\n` +
        `📄 *Quotation No:* ${docNum}\n` +
        `💰 *Estimated Total:* ${formatCurrency(data.grandTotal || 0)}\n` +
        `🔗 *View Quotation Sheet:*\n${resolvedUrl}\n\n` +
        `Please let us know if you would like any revisions or wish to proceed.\n` +
        `📞 ${SHOP_DETAILS.phone} | ~ ${SHOP_DETAILS.name}`
    } else if (data.documentType === 'service') {
      waText =
        `*Service Ticket from ${SHOP_DETAILS.name}*\n\n` +
        `Dear ${recipient},\n` +
        `Here are the details of your service repair job:\n\n` +
        `🔧 *Job Ref:* ${docNum}\n` +
        (data.grandTotal ? `💰 *Amount:* ${formatCurrency(data.grandTotal)}\n` : '') +
        `🔗 *Track / View Job:*\n${resolvedUrl}\n\n` +
        `📞 ${SHOP_DETAILS.phone} | ~ ${SHOP_DETAILS.name}`
    } else if (data.documentType === 'purchase') {
      waText =
        `*Purchase Bill / Goods Receipt - ${SHOP_DETAILS.name}*\n\n` +
        `Vendor / Supplier: ${recipient}\n` +
        `📄 *Bill No:* ${docNum}\n` +
        `💰 *Total:* ${formatCurrency(data.grandTotal || 0)}\n` +
        `🔗 *View Record:*\n${resolvedUrl}`
    } else {
      waText =
        `*${data.title} - ${SHOP_DETAILS.name}*\n\n` +
        `Dear ${recipient},\n` +
        `Please access your document online at:\n${resolvedUrl}\n\n` +
        `📞 ${SHOP_DETAILS.phone}`
    }

    setMessage(waText)
  }, [isOpen, data])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !data) return null

  // Clean phone number for WhatsApp
  const rawCleanPhone = phone.replace(/\D/g, '')
  const fullPhone =
    rawCleanPhone.length === 10
      ? `91${rawCleanPhone}`
      : rawCleanPhone.startsWith('91') && rawCleanPhone.length === 12
      ? rawCleanPhone
      : rawCleanPhone

  const whatsappDirectUrl = fullPhone
    ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`

  const whatsappWebUrl = fullPhone
    ? `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`

  // Email URLs
  const emailBody =
    `Dear ${data.recipientName || 'Valued Customer'},\n\n` +
    `Greetings from ${SHOP_DETAILS.name}!\n\n` +
    `Please find below the details for ${data.title}:\n\n` +
    (data.documentNumber ? `Document Number: #${data.documentNumber}\n` : '') +
    (data.grandTotal !== undefined
      ? `Total Amount: ${formatCurrency(data.grandTotal)}\n`
      : '') +
    (data.balanceDue !== undefined && data.balanceDue > 0
      ? `Balance Due: ${formatCurrency(data.balanceDue)}\n`
      : data.balanceDue !== undefined && data.balanceDue <= 0
      ? `Payment Status: Fully Paid\n`
      : '') +
    `\nYou can view and download the official document online using the link below:\n` +
    `${shareUrl}\n\n` +
    `If you have any questions, please do not hesitate to reach out to us.\n\n` +
    `Warm regards,\n` +
    `${SHOP_DETAILS.name}\n` +
    `${SHOP_DETAILS.address}, ${SHOP_DETAILS.city}\n` +
    `Phone: ${SHOP_DETAILS.phone} | Email: ${SHOP_DETAILS.email}`

  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`

  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    email
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    toast.success('Direct link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyText = () => {
    const textToCopy = activeChannel === 'whatsapp' ? message : emailBody
    navigator.clipboard.writeText(textToCopy)
    setCopiedText(true)
    toast.success('Message text copied to clipboard!')
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: message,
          url: shareUrl,
        })
        toast.success('Shared successfully!')
        onClose()
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          toast.error('Could not open system share.')
        }
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in-50 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Share Document</span>
                {data.documentNumber && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    #{data.documentNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {data.recipientName ? `Recipient: ${data.recipientName}` : data.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Selector Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveChannel('whatsapp')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeChannel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Share</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel('email')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeChannel === 'email'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email / Mail</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4">
          {activeChannel === 'whatsapp' ? (
            /* WHATSAPP FORM */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  WhatsApp Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-300 select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number (or leave empty to pick chat)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {phone.replace(/\D/g, '').length >= 10
                    ? `Message will be addressed directly to +91 ${phone.replace(/\D/g, '').slice(-10)}.`
                    : 'Leave blank to choose any contact or group inside WhatsApp.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Message Preview</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Editable before sending
                  </span>
                </label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              {/* WhatsApp Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={whatsappDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </a>

                <a
                  href={whatsappWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open WhatsApp Web</span>
                </a>
              </div>
            </div>
          ) : (
            /* EMAIL FORM */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recipient Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Body Preview
                </label>
                <textarea
                  rows={5}
                  readOnly
                  value={emailBody}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-sans leading-relaxed select-text"
                />
              </div>

              {/* Email Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={gmailWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open in Gmail</span>
                </a>

                <a
                  href={mailtoUrl}
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Default Mail App</span>
                </a>
              </div>
            </div>
          )}

          {/* Quick Copy Link & Full Text Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Copy online link"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Copy formatted message text"
              >
                {copiedText ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedText ? 'Text Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>More Share Options...</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
