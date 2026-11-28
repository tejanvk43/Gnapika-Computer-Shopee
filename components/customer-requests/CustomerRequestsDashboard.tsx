// components/customer-requests/CustomerRequestsDashboard.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Wrench,
  Home,
  Store,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  Volume2,
  Image as ImageIcon,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Eye,
  ExternalLink,
  Search,
  Filter,
  Check,
  X,
  Play,
  Pause,
  Send,
  PlusCircle,
  Building2,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'
import {
  CustomerServiceRequest,
  CustomerQuotationRequest,
} from '@/lib/customerRequests'
import { RequestChatModal } from './RequestChatModal'

interface CustomerRequestsDashboardProps {
  initialServiceRequests: CustomerServiceRequest[]
  initialQuotationRequests: CustomerQuotationRequest[]
  isOwner: boolean
}

export function CustomerRequestsDashboard({
  initialServiceRequests,
  initialQuotationRequests,
  isOwner,
}: CustomerRequestsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'store' | 'quotations'>('home')
  const [serviceRequests, setServiceRequests] = useState<CustomerServiceRequest[]>(
    initialServiceRequests
  )
  const [quotationRequests, setQuotationRequests] = useState<CustomerQuotationRequest[]>(
    initialQuotationRequests
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'accepted' | 'rejected'>('ALL')

  // Modals
  const [chatRequest, setChatRequest] = useState<CustomerServiceRequest | null>(null)
  const [acceptingRequest, setAcceptingRequest] = useState<CustomerServiceRequest | null>(null)
  const [technicianName, setTechnicianName] = useState('')
  const [rejectingRequest, setRejectingRequest] = useState<CustomerServiceRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [replyingQuote, setReplyingQuote] = useState<CustomerQuotationRequest | null>(null)
  const [quoteReplyText, setQuoteReplyText] = useState('')
  const [quotePriceEstimate, setQuotePriceEstimate] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Voice Note Audio state
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const toggleAudio = (url: string) => {
    if (playingAudioUrl === url) {
      audioRef.current?.pause()
      setPlayingAudioUrl(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(url)
      audioRef.current.play()
      setPlayingAudioUrl(url)
      audioRef.current.onended = () => setPlayingAudioUrl(null)
    }
  }

  // Handle Accept Request
  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptingRequest) return

    try {
      const res = await fetch(`/api/admin/customer-requests/${acceptingRequest.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted',
          assigned_technician_name: technicianName.trim(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setServiceRequests((prev) =>
          prev.map((r) => (r.id === data.request.id ? data.request : r))
        )
        toast.success(`Booking #${acceptingRequest.request_number} accepted! Chat is now active.`)
        setAcceptingRequest(null)
        setTechnicianName('')
      } else {
        toast.error('Failed to accept request')
      }
    } catch (err) {
      toast.error('Error accepting request')
    }
  }

  // Handle Reject Request
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingRequest) return

    try {
      const res = await fetch(`/api/admin/customer-requests/${rejectingRequest.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setServiceRequests((prev) =>
          prev.map((r) => (r.id === data.request.id ? data.request : r))
        )
        toast.success(`Booking #${rejectingRequest.request_number} marked as rejected.`)
        setRejectingRequest(null)
        setRejectionReason('')
      } else {
        toast.error('Failed to reject request')
      }
    } catch (err) {
      toast.error('Error rejecting request')
    }
  }

  // Handle Convert to Service Job
  const handleConvert = async (req: CustomerServiceRequest) => {
    if (!confirm(`Convert booking #${req.request_number} into an official Service Job Ticket?`)) return

    try {
      const res = await fetch(`/api/admin/customer-requests/${req.id}/convert`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setServiceRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: 'in_progress', converted_service_job_id: data.serviceJob.id } : r))
        )
        toast.success(data.message)
      } else {
        toast.error('Conversion failed')
      }
    } catch (err) {
      toast.error('Error converting request')
    }
  }

  // Handle Owner Reply to Quotation Request
  const handleReplyQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyingQuote) return

    try {
      const res = await fetch(`/api/admin/quotation-requests/${replyingQuote.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_reply: quoteReplyText.trim(),
          quoted_amount: quotePriceEstimate ? parseFloat(quotePriceEstimate) : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setQuotationRequests((prev) =>
          prev.map((q) => (q.id === data.request.id ? data.request : q))
        )
        toast.success(`Reply sent to customer #${replyingQuote.request_number}!`)
        setReplyingQuote(null)
        setQuoteReplyText('')
        setQuotePriceEstimate('')
      } else {
        toast.error('Failed to reply to quotation request')
      }
    } catch (err) {
      toast.error('Error sending reply')
    }
  }

  // Counts
  const homeRequests = serviceRequests.filter((r) => r.service_type === 'home')
  const storeRequests = serviceRequests.filter((r) => r.service_type === 'store')

  const pendingHome = homeRequests.filter((r) => r.status === 'pending').length
  const pendingStore = storeRequests.filter((r) => r.status === 'pending').length
  const pendingQuotes = quotationRequests.filter((q) => q.status === 'pending').length

  // Filtered requests
  const filteredServices = (activeTab === 'home' ? homeRequests : storeRequests).filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const matchName = r.customer_name?.toLowerCase().includes(q)
      const matchPhone = r.phone_number?.includes(q)
      const matchNum = r.request_number?.toLowerCase().includes(q)
      const matchDesc = r.problem_description?.toLowerCase().includes(q)
      return matchName || matchPhone || matchNum || matchDesc
    }
    return true
  })

  const filteredQuotes = quotationRequests.filter((q) => {
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      return (
        q.customer_name?.toLowerCase().includes(term) ||
        q.phone_number?.includes(term) ||
        q.requirements_description?.toLowerCase().includes(term) ||
        q.company_name?.toLowerCase().includes(term)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Customer Bookings &amp; Quotation Requests
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Incoming requests from mobile app with voice notes, problem photos, and live chat
              </p>
            </div>
          </div>
        </div>

        {/* Pending Badges Quick Summary */}
        <div className="flex items-center gap-2">
          {pendingHome > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <Home className="w-3.5 h-3.5" />
              <span>{pendingHome} Home Pending</span>
            </span>
          )}
          {pendingStore > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <Store className="w-3.5 h-3.5" />
              <span>{pendingStore} Store Pending</span>
            </span>
          )}
          {pendingQuotes > 0 && isOwner && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <FileText className="w-3.5 h-3.5" />
              <span>{pendingQuotes} Quotes Pending</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 text-orange-600" />
            <span>Home Service Bookings ({homeRequests.length})</span>
            {pendingHome > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-600 text-white font-mono">
                {pendingHome}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'store'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-4 h-4 text-blue-600" />
            <span>Store Visit Appointments ({storeRequests.length})</span>
            {pendingStore > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-mono">
                {pendingStore}
              </span>
            )}
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('quotations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'quotations'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Quotation Requests ({quotationRequests.length})</span>
              {pendingQuotes > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-mono">
                  {pendingQuotes}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1 & 2: SERVICE REQUESTS (HOME & STORE)                         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab !== 'quotations' && (
        <div className="space-y-4">
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <Wrench className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No {activeTab === 'home' ? 'Home Service' : 'Store Visit'} requests found.
              </p>
              <p className="text-xs">
                When customers submit bookings through the mobile app, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((req) => {
                const isAccepted = req.status === 'accepted' || req.status === 'in_progress'
                const isRejected = req.status === 'rejected'
                const isPending = req.status === 'pending'

                return (
                  <div
                    key={req.id}
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition shadow-xs flex flex-col justify-between space-y-4 ${
                      isPending
                        ? 'border-orange-300 dark:border-orange-900/60 ring-2 ring-orange-400/20'
                        : isAccepted
                        ? 'border-emerald-300 dark:border-emerald-900/60'
                        : 'border-slate-200 dark:border-slate-800 opacity-80'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Request # & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              #{req.request_number}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                                  : isAccepted
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                            {req.customer_name}
                          </h3>
                        </div>

                        <div className="text-right text-[11px] text-slate-400 font-mono">
                          {new Date(req.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </div>

                      {/* Contact & Scheduled Date / Time */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {req.phone_number}
                          </span>
                        </div>
                        {req.alt_phone_number && (
                          <div className="text-slate-500 font-mono text-[11px]">
                            Alt: {req.alt_phone_number}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 col-span-2">
                          <Calendar className="w-3.5 h-3.5 text-orange-600" />
                          <span>
                            Slot: <strong>{req.preferred_date}</strong> ({req.preferred_time_slot})
                          </span>
                        </div>
                        {req.address && (
                          <div className="flex items-start gap-1.5 col-span-2 text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span className="leading-tight">{req.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Device & Problem Description */}
                      <div className="space-y-1.5">
                        {(req.device_type || req.brand || req.model) && (
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {req.brand} {req.model} ({req.device_type})
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-100/60 dark:bg-slate-800/40 p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap">
                          {req.problem_description}
                        </p>
                      </div>

                      {/* Voice Note & Images Attachments */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {req.voice_note_url && (
                          <button
                            type="button"
                            onClick={() => toggleAudio(req.voice_note_url!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold hover:bg-orange-200 transition cursor-pointer"
                          >
                            {playingAudioUrl === req.voice_note_url ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{playingAudioUrl === req.voice_note_url ? 'Pause Audio' : 'Play Voice Note'}</span>
                          </button>
                        )}

                        {req.image_urls && req.image_urls.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {req.image_urls.map((img, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewImage(img)}
                                className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 hover:scale-105 transition cursor-pointer"
                              >
                                <img src={img} alt="Problem Photo" className="w-full h-full object-cover" />
                              </button>
                            ))}
                            <span className="text-[10px] text-slate-400">
                              ({req.image_urls.length} photo{req.image_urls.length > 1 ? 's' : ''})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rejection Note or Assigned Technician */}
                      {req.rejection_reason && (
                        <div className="text-[11px] p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl">
                          <strong>Rejection Reason:</strong> {req.rejection_reason}
                        </div>
                      )}
                      {req.assigned_technician_name && (
                        <div className="text-[11px] p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-1.5 font-semibold">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Assigned Technician: {req.assigned_technician_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      {isPending ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setAcceptingRequest(req)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingRequest(req)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setChatRequest(req)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Live Chat</span>
                          </button>

                          {!req.converted_service_job_id ? (
                            <button
                              type="button"
                              onClick={() => handleConvert(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-xs font-bold border border-orange-200 dark:border-orange-900 transition cursor-pointer"
                              title="Convert to official job ticket"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Create Job</span>
                            </button>
                          ) : (
                            <Link
                              href={`/dashboard/services/${req.converted_service_job_id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition"
                            >
                              <span>View Job</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      )}

                      <a
                        href={`https://wa.me/91${req.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hello ${req.customer_name}, regarding your service booking #${req.request_number} with Gnapika Computer Shopee:`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <span>WhatsApp</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: QUOTATION REQUESTS (OWNER EXCLUSIVE)                         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'quotations' && isOwner && (
        <div className="space-y-4">
          {filteredQuotes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No quotation requests found.
              </p>
              <p className="text-xs">
                When prospective clients request custom PC, laptop, or hardware quotes, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-600">
                            #{quote.request_number}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {quote.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                          {quote.customer_name}
                        </h3>
                        {quote.company_name && (
                          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{quote.company_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        {new Date(quote.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {quote.phone_number}
                        </span>
                      </div>
                      {quote.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{quote.email}</span>
                        </div>
                      )}
                      {quote.budget_range && (
                        <div className="col-span-2 text-slate-700 dark:text-slate-300 font-semibold">
                          Budget: {quote.budget_range} | Urgency: {quote.urgency}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Client Requirements:
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-100/60 dark:bg-slate-800/40 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                        {quote.requirements_description}
                      </p>
                    </div>

                    {quote.owner_reply && (
                      <div className="text-xs p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl space-y-1">
                        <span className="font-bold block text-[11px] text-emerald-700 dark:text-emerald-400">
                          Your Reply to Client:
                        </span>
                        <p>{quote.owner_reply}</p>
                        {quote.quoted_amount && (
                          <div className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                            Estimated: {formatCurrency(quote.quoted_amount)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Owner Action Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingQuote(quote)
                          setQuoteReplyText(quote.owner_reply || '')
                          setQuotePriceEstimate(quote.quoted_amount ? quote.quoted_amount.toString() : '')
                        }}
                        className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <span>{quote.owner_reply ? 'Update Reply' : 'Send Estimate Reply'}</span>
                      </button>

                      <Link
                        href={`/dashboard/quotations/new?name=${encodeURIComponent(quote.customer_name)}&phone=${encodeURIComponent(quote.phone_number)}&company=${encodeURIComponent(quote.company_name || '')}`}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-primary" />
                        <span>Create Formal Quote</span>
                      </Link>
                    </div>

                    <a
                      href={`https://wa.me/91${quote.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello ${quote.customer_name}, regarding your quotation request #${quote.request_number} with Gnapika Computer Shopee:`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <span>WhatsApp</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ACCEPT SERVICE BOOKING                                */}
      {/* ============================================================== */}
      {acceptingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Accept Booking #{acceptingRequest.request_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAcceptingRequest(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccept} className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Customer &amp; Time Slot:</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {acceptingRequest.customer_name} ({acceptingRequest.phone_number})
                </p>
                <p className="text-slate-500">
                  {acceptingRequest.preferred_date} • {acceptingRequest.preferred_time_slot}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assign Technician (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh, Teja, Senior Hardware Tech"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Accepting this request will notify the customer and open a live real-time chat channel so you can coordinate repairs.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAcceptingRequest(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Confirm Acceptance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REJECT SERVICE BOOKING                                */}
      {/* ============================================================== */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Booking #{rejectingRequest.request_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Selected time slot is fully booked / Out of home service delivery radius / Hardware parts currently unavailable"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: OWNER QUOTATION ESTIMATE REPLY                        */}
      {/* ============================================================== */}
      {replyingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Reply to Quote #{replyingQuote.request_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReplyingQuote(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReplyQuotation} className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Client &amp; Requirements:</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {replyingQuote.customer_name} ({replyingQuote.phone_number})
                </p>
                <p className="text-slate-500 line-clamp-2 mt-1">
                  {replyingQuote.requirements_description}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Price Estimate (₹ Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 45000"
                  value={quotePriceEstimate}
                  onChange={(e) => setQuotePriceEstimate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Response / Specifications Note *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. We have reviewed your specifications. We recommend the Intel Core i5 12th Gen system with 16GB DDR4 RAM and 512GB NVMe SSD at Rs. 42,500 + GST. Ready in 2 days."
                  value={quoteReplyText}
                  onChange={(e) => setQuoteReplyText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyingQuote(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: IMAGE LIGHTBOX PREVIEW                                */}
      {/* ============================================================== */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-xl hover:bg-black/90 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Problem Photo" className="w-full h-auto max-h-[85vh] object-contain" />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: REAL-TIME CHAT                                        */}
      {/* ============================================================== */}
      <RequestChatModal
        request={chatRequest}
        isOpen={!!chatRequest}
        onClose={() => setChatRequest(null)}
      />
    </div>
  )
}
