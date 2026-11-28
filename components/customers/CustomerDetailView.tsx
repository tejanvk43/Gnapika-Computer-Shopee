'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Wrench,
  Search,
  Calendar,
  Filter,
  Plus,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlusCircle,
  MessageCircle,
  ShieldCheck,
  Laptop,
  X,
  Eye,
  Printer,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'
import { PaymentCollectionModal } from '@/components/billing/PaymentCollectionModal'
import { TaxInvoicePaperView } from '@/components/billing/TaxInvoicePaperView'
import { printTaxInvoice } from '@/lib/invoicePrinter'
import { ShareModal } from '@/components/common/ShareModal'
import { buildWhatsAppUrl } from '@/lib/crm'

interface CustomerDetailProps {
  customer: {
    id: string
    customer_name: string
    phone_number: string | null
    alt_phone_number: string | null
    email: string | null
    address: string | null
    gstin: string | null
    customer_type?: string | null
    credit_limit?: number | null
    credit_period_days?: number | null
    company_name?: string | null
    created_at: string
  }
  invoices: any[]
  services: any[]
  amcs?: any[]
  devices?: any[]
  activities?: any[]
}

export function CustomerDetailView({
  customer,
  invoices,
  services,
  amcs = [],
  devices = [],
  activities = [],
}: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState<'both' | 'billing' | 'services' | 'amc' | 'devices' | 'activities'>('both')
  const [customerInvoices, setCustomerInvoices] = useState<any[]>(invoices)
  const [customerDevices, setCustomerDevices] = useState<any[]>(devices)
  const [customerActivities, setCustomerActivities] = useState<any[]>(activities)
  const [customerAmcs, setCustomerAmcs] = useState<any[]>(amcs)

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null)
  const [invoiceToShare, setInvoiceToShare] = useState<any | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false)
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false)

  const [searchId, setSearchId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Close invoice viewer modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingInvoice(null)
      }
    }
    if (viewingInvoice) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewingInvoice])

  // Sync payments if viewing invoice
  useEffect(() => {
    if (!viewingInvoice?.id) return
    let active = true
    fetch(`/api/billing/${viewingInvoice.id}/payments`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return
        if (data.invoice) {
          setViewingInvoice((prev: any) =>
            prev && prev.id === data.invoice.id ? { ...prev, ...data.invoice } : prev
          )
          setCustomerInvoices((prev) =>
            prev.map((it) => (it.id === data.invoice.id ? { ...it, ...data.invoice } : it))
          )
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [viewingInvoice?.id])

  // Device Form
  const [deviceForm, setDeviceForm] = useState({
    device_type: 'Laptop',
    brand: '',
    model: '',
    serial_number: '',
    configuration_specs: '',
    warranty_type: 'Shop Warranty',
    warranty_expiry_date: '',
  })
  const [submittingDevice, setSubmittingDevice] = useState(false)

  // Activity Form
  const [activityForm, setActivityForm] = useState({
    activity_type: 'Note',
    summary: '',
    details: '',
    follow_up_date: '',
    follow_up_time: '',
  })
  const [submittingActivity, setSubmittingActivity] = useState(false)

  // Calculate customer financial totals
  const totalBilled = customerInvoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.total_grand_amount || '0') || 0),
    0
  )
  const totalPaid = customerInvoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.amount_paid || '0') || 0),
    0
  )
  const totalDue = customerInvoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.balance_due || '0') || 0),
    0
  )

  // Filter Invoices
  const filteredInvoices = customerInvoices.filter((inv) => {
    if (activeTab === 'services' || activeTab === 'amc' || activeTab === 'devices' || activeTab === 'activities') return false

    if (searchId) {
      const match = inv.invoice_number?.toLowerCase().includes(searchId.toLowerCase())
      if (!match) return false
    }

    if (fromDate && new Date(inv.invoice_date) < new Date(fromDate)) return false
    if (toDate && new Date(inv.invoice_date) > new Date(toDate + 'T23:59:59')) return false

    return true
  })

  // Filter Services
  const filteredServices = services.filter((svc) => {
    if (activeTab === 'billing' || activeTab === 'amc' || activeTab === 'devices' || activeTab === 'activities') return false

    if (searchId) {
      const match = svc.service_ref_number?.toLowerCase().includes(searchId.toLowerCase())
      if (!match) return false
    }

    if (fromDate && new Date(svc.created_at) < new Date(fromDate)) return false
    if (toDate && new Date(svc.created_at) > new Date(toDate + 'T23:59:59')) return false

    return true
  })

  // Handle Add Device
  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deviceForm.brand) return

    setSubmittingDevice(true)
    try {
      const res = await fetch('/api/crm/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deviceForm,
          customer_id: customer.id,
        }),
      })
      const json = await res.json()
      if (res.ok && json.device) {
        setCustomerDevices((prev) => [json.device, ...prev])
        setIsAddDeviceOpen(false)
        setDeviceForm({
          device_type: 'Laptop',
          brand: '',
          model: '',
          serial_number: '',
          configuration_specs: '',
          warranty_type: 'Shop Warranty',
          warranty_expiry_date: '',
        })
      }
    } catch (err) {
      console.error('Error adding device:', err)
    } finally {
      setSubmittingDevice(false)
    }
  }

  // Handle Add Activity
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityForm.summary) return

    setSubmittingActivity(true)
    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityForm,
          customer_id: customer.id,
        }),
      })
      const json = await res.json()
      if (res.ok && json.activity) {
        setCustomerActivities((prev) => [json.activity, ...prev])
        setIsAddActivityOpen(false)
        setActivityForm({
          activity_type: 'Note',
          summary: '',
          details: '',
          follow_up_date: '',
          follow_up_time: '',
        })
      }
    } catch (err) {
      console.error('Error adding activity:', err)
    } finally {
      setSubmittingActivity(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* WhatsApp Communications Button */}
          {customer.phone_number && (
            <button
              type="button"
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Menu</span>
            </button>
          )}

          <Link
            href={`/dashboard/billing/new?customer_id=${customer.id}&phone=${customer.phone_number || ''}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Bill</span>
          </Link>

          <Link
            href={`/dashboard/services/new?customer_id=${customer.id}&phone=${customer.phone_number || ''}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Service</span>
          </Link>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                {customer.customer_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {customer.customer_name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {customer.customer_type || 'Retail Walk-in'}
                  </span>
                </div>
                <p className="text-sm font-mono text-primary font-medium mt-0.5">
                  {customer.phone_number || 'No Phone Number'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs text-slate-600 dark:text-slate-400">
              {customer.alt_phone_number && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Alt: {customer.alt_phone_number}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {customer.email}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {customer.address}
                </span>
              )}
              {customer.gstin && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  GSTIN: {customer.gstin}
                </span>
              )}
              {customer.credit_limit ? (
                <span className="flex items-center gap-1.5 font-bold text-amber-600">
                  Credit Limit: {formatCurrency(customer.credit_limit)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Invoices</span>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{customerInvoices.length}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Billed</span>
              <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">{formatCurrency(totalBilled)}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-[11px] text-emerald-600 font-semibold uppercase">Total Paid</span>
              <p className="text-base font-bold font-mono text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</p>
            </div>
            <div className={`p-3 rounded-xl ${totalDue > 0 ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
              <span className={`text-[11px] font-bold uppercase ${totalDue > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500'}`}>Balance Due</span>
              <p className={`text-base font-black font-mono mt-0.5 ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                {totalDue > 0 ? formatCurrency(totalDue) : '₹0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer 360 Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl self-start">
        {[
          { id: 'both', label: 'All History' },
          { id: 'billing', label: `Bills & Sales (${customerInvoices.length})` },
          { id: 'services', label: `Service Jobs (${services.length})` },
          { id: 'amc', label: `AMC Contracts (${customerAmcs.length})` },
          { id: 'devices', label: `Hardware Assets (${customerDevices.length})` },
          { id: 'activities', label: `Activity Notes (${customerActivities.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar for Bills & Services */}
      {(activeTab === 'both' || activeTab === 'billing' || activeTab === 'services') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Search By Bill ID or Service ID..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: BILLS & INVOICES */}
      {(activeTab === 'both' || activeTab === 'billing') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Bills &amp; Sales Invoices ({filteredInvoices.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3 pl-4">Date</th>
                  <th className="p-3">Bill / Invoice #</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group/row">
                      <td className="p-3 pl-4 font-mono text-slate-500">{inv.invoice_date?.slice(0, 10)}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(inv)}
                          className="font-mono font-bold text-primary hover:text-primary/80 hover:underline flex items-center gap-1.5 cursor-pointer text-left group"
                          title="Click to view Tax Invoice"
                        >
                          <span>{inv.invoice_number}</span>
                          <Eye className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                        </button>
                      </td>
                      <td className="p-3">{inv.payment_method || 'Cash'}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(parseFloat(inv.total_grand_amount || 0))}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                        {formatCurrency(parseFloat(inv.amount_paid || 0))}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        {parseFloat(inv.balance_due || 0) > 0 ? formatCurrency(parseFloat(inv.balance_due)) : '₹0.00'}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition inline-flex items-center gap-1 cursor-pointer"
                            title="View Tax Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Bill</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceToShare(inv)
                              setIsShareModalOpen(true)
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Share via WhatsApp or Email"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          {parseFloat(inv.balance_due || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(inv)
                                setIsPaymentModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                            >
                              Collect Due
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: SERVICE JOBS */}
      {(activeTab === 'both' || activeTab === 'services') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Service &amp; Repair History ({filteredServices.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3 pl-4">Date</th>
                  <th className="p-3">Service Ref #</th>
                  <th className="p-3">Device / Model</th>
                  <th className="p-3">Reported Problem</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Est. Cost</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No service records found.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((svc) => (
                    <tr key={svc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 pl-4 font-mono text-slate-500">{svc.created_at.slice(0, 10)}</td>
                      <td className="p-3">
                        <Link
                          href={`/dashboard/services/${svc.id}`}
                          className="font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1 group"
                          title="Open Service Job"
                        >
                          <span>{svc.service_ref_number}</span>
                          <ExternalLink className="w-3 h-3 text-orange-400 group-hover:text-orange-600" />
                        </Link>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {svc.company_brand} {svc.model} ({svc.device_type})
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-500">{svc.problem_description}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {svc.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(svc.estimated_cost || 0).toFixed(2)}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <Link
                          href={`/dashboard/services/${svc.id}`}
                          className="inline-flex items-center gap-1 text-orange-600 hover:underline font-bold"
                        >
                          <span>View Job</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: AMC AGREEMENTS */}
      {activeTab === 'amc' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Annual Maintenance Contracts ({customerAmcs.length})
              </h3>
            </div>
            <Link
              href="/dashboard/crm"
              className="text-xs font-bold text-primary hover:underline"
            >
              Manage in CRM Hub ➔
            </Link>
          </div>

          <div className="space-y-3">
            {customerAmcs.map((amc) => (
              <div
                key={amc.id}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{amc.contract_number}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{amc.contract_title}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Period: {amc.start_date} to {amc.end_date} | {amc.covered_devices_count} Covered Devices
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Visits Completed</div>
                    <div className="font-mono font-bold text-sm text-emerald-600">
                      {amc.service_visits_completed} / {amc.service_visits_allowed}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      amc.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {amc.status}
                  </span>
                </div>
              </div>
            ))}

            {customerAmcs.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No active AMC contracts for this client.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: HARDWARE DEVICES & ASSETS */}
      {activeTab === 'devices' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Registered Hardware Assets &amp; Devices ({customerDevices.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddDeviceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Device</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerDevices.map((dev) => (
              <div
                key={dev.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {dev.brand} {dev.model}
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {dev.device_type}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    S/N: {dev.serial_number || 'N/A'}
                  </span>
                </div>

                {dev.configuration_specs && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                    {dev.configuration_specs}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-400">Warranty: {dev.warranty_type}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    Expires: {dev.warranty_expiry_date || 'N/A'}
                  </span>
                </div>
              </div>
            ))}

            {customerDevices.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                No hardware assets registered yet. Click "+ Register Device" to add laptops, PCs, or printers.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 5: ACTIVITY NOTES & LOGS */}
      {activeTab === 'activities' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Customer Interaction Notes &amp; Follow-Ups ({customerActivities.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddActivityOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Note / Call</span>
            </button>
          </div>

          <div className="space-y-3">
            {customerActivities.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {act.activity_type}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{act.summary}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {act.created_at?.slice(0, 10)}
                  </span>
                </div>

                {act.details && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-2">
                    {act.details}
                  </p>
                )}

                {act.follow_up_date && (
                  <div className="text-[11px] font-bold text-amber-600 pl-2">
                    ⏰ Follow-up: {act.follow_up_date} ({act.follow_up_status || 'Pending'})
                  </div>
                )}
              </div>
            ))}

            {customerActivities.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No activity logs recorded. Click "+ Log Note / Call" to record a conversation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: 1-CLICK WHATSAPP COMMUNICATION      */}
      {/* ========================================== */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Send WhatsApp Alert
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    To {customer.customer_name} ({customer.phone_number})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select WhatsApp Template:
              </span>

              {/* Template 1: Payment Reminder */}
              <a
                href={buildWhatsAppUrl(customer.phone_number || '', 'payment_reminder', {
                  customerName: customer.customer_name,
                  balanceDue: totalDue,
                  invoiceNumber: customerInvoices[0]?.invoice_number || 'Bill',
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700">
                  💳 Payment &amp; Balance Due Reminder
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Sends polite notice of outstanding dues: {formatCurrency(totalDue)}
                </div>
              </a>

              {/* Template 2: Service Ready Alert */}
              <a
                href={buildWhatsAppUrl(customer.phone_number || '', 'service_ready', {
                  customerName: customer.customer_name,
                  deviceModel: services[0]?.device_type || 'Device',
                  grandTotal: parseFloat(services[0]?.estimated_cost || 0),
                  serviceRefNumber: services[0]?.service_ref_number || 'Job',
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-purple-700">
                  🔧 Service Device Ready for Pickup
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Alerts customer that repaired hardware is ready to collect
                </div>
              </a>

              {/* Template 3: Quotation Follow-up */}
              <a
                href={buildWhatsAppUrl(customer.phone_number || '', 'quotation_followup', {
                  customerName: customer.customer_name,
                  companyName: customer.company_name || 'your company',
                  quotationNumber: 'Quotation',
                  grandTotal: 25000,
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-700">
                  📑 Quotation Follow-up &amp; Discussion
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Follows up on quotation pricing and approval
                </div>
              </a>

              {/* Template 4: AMC Renewal */}
              <a
                href={buildWhatsAppUrl(customer.phone_number || '', 'amc_renewal', {
                  customerName: customer.customer_name,
                  contractNumber: customerAmcs[0]?.contract_number || 'AMC-2026',
                  contractTitle: customerAmcs[0]?.contract_title || 'IT Maintenance',
                  expiryDate: customerAmcs[0]?.end_date || 'Soon',
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700">
                  🛡️ AMC Renewal Notification
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Reminds customer regarding annual IT contract renewal
                </div>
              </a>

              {/* Template 5: General Greeting */}
              <a
                href={buildWhatsAppUrl(customer.phone_number || '', 'general_greeting', {
                  customerName: customer.customer_name,
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white">
                  👋 General Message / Assistance
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Standard Gnapika Computer Services signature greeting
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: REGISTER HARDWARE DEVICE            */}
      {/* ========================================== */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Register Customer Hardware Asset
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDeviceOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Device Type</label>
                  <select
                    value={deviceForm.device_type}
                    onChange={(e) => setDeviceForm({ ...deviceForm, device_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    {['Laptop', 'Desktop', 'Printer', 'CCTV', 'MacBook', 'Server', 'Other'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell, HP, Lenovo"
                    value={deviceForm.brand}
                    onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Inspiron 15 3511"
                    value={deviceForm.model}
                    onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 8XYZ123"
                    value={deviceForm.serial_number}
                    onChange={(e) => setDeviceForm({ ...deviceForm, serial_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Specs / Configuration</label>
                <input
                  type="text"
                  placeholder="e.g. Core i5 11th Gen, 16GB RAM, 512GB SSD"
                  value={deviceForm.configuration_specs}
                  onChange={(e) => setDeviceForm({ ...deviceForm, configuration_specs: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Warranty Type</label>
                  <select
                    value={deviceForm.warranty_type}
                    onChange={(e) => setDeviceForm({ ...deviceForm, warranty_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    {['Shop Warranty', 'Manufacturer Warranty', 'AMC Covered', 'Out of Warranty', 'Extended Warranty'].map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Warranty Expiry</label>
                  <input
                    type="date"
                    value={deviceForm.warranty_expiry_date}
                    onChange={(e) => setDeviceForm({ ...deviceForm, warranty_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeviceOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDevice}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold transition disabled:opacity-50"
                >
                  {submittingDevice ? 'Saving...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: LOG ACTIVITY / NOTE                 */}
      {/* ========================================== */}
      {isAddActivityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Log Customer Interaction
              </h3>
              <button
                type="button"
                onClick={() => setIsAddActivityOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Activity Type</label>
                <select
                  value={activityForm.activity_type}
                  onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  {['Call', 'Meeting', 'WhatsApp', 'Note', 'Email', 'Shop Visit'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Subject / Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call regarding printer cartridge & new laptop quote"
                  value={activityForm.summary}
                  onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Details</label>
                <textarea
                  rows={2}
                  placeholder="Additional conversation notes..."
                  value={activityForm.details}
                  onChange={(e) => setActivityForm({ ...activityForm, details: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={activityForm.follow_up_date}
                    onChange={(e) => setActivityForm({ ...activityForm, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-1">Time</label>
                  <input
                    type="time"
                    value={activityForm.follow_up_time}
                    onChange={(e) => setActivityForm({ ...activityForm, follow_up_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingActivity}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold transition disabled:opacity-50"
                >
                  {submittingActivity ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: VIEW TAX INVOICE                    */}
      {/* ========================================== */}
      {viewingInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in-50 duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingInvoice(null)
          }}
        >
          <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-100 dark:bg-slate-950 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white font-mono">
                      {viewingInvoice.invoice_number}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        parseFloat(viewingInvoice.balance_due || 0) <= 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {parseFloat(viewingInvoice.balance_due || 0) <= 0
                        ? 'PAID'
                        : `DUE: ${formatCurrency(parseFloat(viewingInvoice.balance_due))}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dated {viewingInvoice.invoice_date ? new Date(viewingInvoice.invoice_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }) : '-'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {parseFloat(viewingInvoice.balance_due || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(viewingInvoice)
                      setIsPaymentModalOpen(true)
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Collect Due</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const hydrated = {
                      ...viewingInvoice,
                      customer: viewingInvoice.customer || viewingInvoice.customers || customer,
                    }
                    printTaxInvoice(hydrated)
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Print Tax Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <Link
                  href={`/dashboard/billing/${viewingInvoice.id}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shadow-xs"
                  title="Open Full Page in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Page</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setInvoiceToShare(viewingInvoice)
                    setIsShareModalOpen(true)
                  }}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Share Invoice via WhatsApp or Email"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Paper Preview */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/60 dark:bg-slate-950 flex justify-center">
              <div className="w-full max-w-[850px] shadow-2xl rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800 bg-white">
                <TaxInvoicePaperView
                  invoice={{
                    ...viewingInvoice,
                    customer: viewingInvoice.customer || viewingInvoice.customers || customer,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Collection Modal */}
      <PaymentCollectionModal
        invoice={selectedInvoice}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setSelectedInvoice(null)
        }}
        onPaymentSuccess={(updated) => {
          setCustomerInvoices((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          )
          if (viewingInvoice?.id === updated.id) {
            setViewingInvoice((prev: any) => ({ ...prev, ...updated }))
          }
        }}
      />

      {/* Share Modal (WhatsApp & Email) */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false)
          setInvoiceToShare(null)
        }}
        data={
          invoiceToShare
            ? {
                title: `Tax Invoice #${invoiceToShare.invoice_number || ''}`,
                documentType: 'invoice',
                documentNumber: invoiceToShare.invoice_number,
                recipientName:
                  invoiceToShare.customer?.customer_name ||
                  invoiceToShare.customers?.customer_name ||
                  customer.customer_name,
                recipientPhone:
                  invoiceToShare.customer?.phone_number ||
                  invoiceToShare.customers?.phone_number ||
                  customer.phone_number ||
                  '',
                recipientEmail:
                  invoiceToShare.customer?.email ||
                  invoiceToShare.customers?.email ||
                  customer.email ||
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
