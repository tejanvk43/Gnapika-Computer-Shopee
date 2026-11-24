'use client'

import { useState } from 'react'
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
} from 'lucide-react'

interface CustomerDetailProps {
  customer: {
    id: string
    customer_name: string
    phone_number: string | null
    alt_phone_number: string | null
    email: string | null
    address: string | null
    gstin: string | null
    created_at: string
  }
  invoices: any[]
  services: any[]
}

export function CustomerDetailView({ customer, invoices, services }: CustomerDetailProps) {
  const [searchId, setSearchId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'Both' | 'Bills & Sales' | 'Services'>('Both')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Filter Invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (categoryFilter === 'Services') return false

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
    if (categoryFilter === 'Bills & Sales') return false

    if (searchId) {
      const match = svc.service_ref_number?.toLowerCase().includes(searchId.toLowerCase())
      if (!match) return false
    }

    if (fromDate && new Date(svc.created_at) < new Date(fromDate)) return false
    if (toDate && new Date(svc.created_at) > new Date(toDate + 'T23:59:59')) return false

    return true
  })

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
        <div className="flex items-center gap-3">
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

      {/* Customer Header Card (Matching Diagram: Teja 8919998149) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-primary flex items-center justify-center font-bold text-xl">
                {customer.customer_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {customer.customer_name}
                </h1>
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
            </div>
          </div>

          <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Invoices</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{invoices.length}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Services</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{services.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar (Matching Diagram: Search By Bill ID or Service ID, Category, Date Range) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by Bill ID or Service ID */}
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

          {/* Category Dropdown */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
            >
              <option value="Both">Category: Both</option>
              <option value="Bills & Sales">Bills & Sales</option>
              <option value="Services">Services</option>
            </select>
          </div>

          {/* From Date */}
          <div className="relative flex items-center">
            <span className="text-xs text-slate-400 mr-2 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
            />
          </div>

          {/* To Date */}
          <div className="relative flex items-center">
            <span className="text-xs text-slate-400 mr-2 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Section 1: Billings Table (Matching Diagram) */}
      {(categoryFilter === 'Both' || categoryFilter === 'Bills & Sales') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Billings & Sales ({filteredInvoices.length})
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3 pl-4">S.No</th>
                  <th className="p-3">Bill ID</th>
                  <th className="p-3">Bill Date</th>
                  <th className="p-3">Product Name(s)</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3">Warranty</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No billing records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => {
                    const productNames =
                      inv.invoice_items?.map((it: any) => it.products?.name).filter(Boolean).join(', ') ||
                      'General Items'
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 pl-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-semibold text-primary">{inv.invoice_number}</td>
                        <td className="p-3">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                        <td className="p-3 max-w-xs truncate">{productNames}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{parseFloat(inv.total_grand_amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-500">1 Year Standard</td>
                        <td className="p-3 pr-4 text-right">
                          <Link
                            href={`/dashboard/billing/${inv.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            <span>View Bill</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Services Table (Matching Diagram) */}
      {(categoryFilter === 'Both' || categoryFilter === 'Services') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Services ({filteredServices.length})
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3 pl-4">S.No</th>
                  <th className="p-3">In-Date</th>
                  <th className="p-3">Service Ref</th>
                  <th className="p-3">Service Type</th>
                  <th className="p-3">Product Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Out-Date</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      No service records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((svc, idx) => {
                    const isOut = svc.status === 'Completed' || svc.status === 'Delivered'
                    const outDate = isOut
                      ? new Date(svc.updated_at || svc.expected_completion_date || svc.created_at).toLocaleDateString()
                      : '-'
                    return (
                      <tr key={svc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 pl-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3">{new Date(svc.created_at).toLocaleDateString()}</td>
                        <td className="p-3 font-mono font-semibold text-orange-600">{svc.service_ref_number}</td>
                        <td className="p-3">{svc.diagnosis || 'Hardware / OS Repair'}</td>
                        <td className="p-3">
                          {svc.company_brand} {svc.model} ({svc.device_type})
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 border border-slate-200">
                            {svc.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{outDate}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{parseFloat(svc.estimated_cost || 0).toFixed(2)}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <Link
                            href={`/dashboard/services/${svc.id}`}
                            className="inline-flex items-center gap-1 text-orange-600 hover:underline font-medium"
                          >
                            <span>View Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
