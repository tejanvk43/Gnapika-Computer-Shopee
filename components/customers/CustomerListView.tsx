'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  FileText,
  Wrench,
  Eye,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  PlusCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { PaymentCollectionModal } from '@/components/billing/PaymentCollectionModal'

interface CustomerListViewProps {
  initialCustomers: any[]
}

export function CustomerListView({ initialCustomers }: CustomerListViewProps) {
  const [customers, setCustomers] = useState<any[]>(initialCustomers)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'ALL' | 'DUE' | 'CLEARED'>('ALL')
  const [collectInvoice, setCollectInvoice] = useState<any | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Calculate stats for each customer
  const customerStats = customers.map((c) => {
    const invs = c.invoices || []
    const totalBilled = invs.reduce(
      (sum: number, inv: any) => sum + (parseFloat(inv.total_grand_amount || '0') || 0),
      0
    )
    const totalPaid = invs.reduce(
      (sum: number, inv: any) => sum + (parseFloat(inv.amount_paid || '0') || 0),
      0
    )
    const totalDue = invs.reduce(
      (sum: number, inv: any) => sum + (parseFloat(inv.balance_due || '0') || 0),
      0
    )
    const dueInvoices = invs.filter((inv: any) => parseFloat(inv.balance_due || '0') > 0)

    return {
      ...c,
      totalBilled,
      totalPaid,
      totalDue,
      dueInvoices,
      hasDue: totalDue > 0,
    }
  })

  // Aggregated KPIs across all customers
  const totalCustomersCount = customerStats.length
  const totalOutstandingCustomerDues = customerStats.reduce(
    (sum, c) => sum + c.totalDue,
    0
  )
  const customersWithDues = customerStats.filter((c) => c.hasDue)
  const customersWithDuesCount = customersWithDues.length
  const clearedCustomersCount = totalCustomersCount - customersWithDuesCount

  // Filtered customer list
  const filteredCustomers = customerStats.filter((c) => {
    if (filterMode === 'DUE' && !c.hasDue) return false
    if (filterMode === 'CLEARED' && c.hasDue) return false

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      const matchName = c.customer_name?.toLowerCase().includes(q)
      const matchPhone = c.phone_number?.toLowerCase().includes(q)
      const matchAltPhone = c.alt_phone_number?.toLowerCase().includes(q)
      const matchEmail = c.email?.toLowerCase().includes(q)
      const matchGstin = c.gstin?.toLowerCase().includes(q)
      return matchName || matchPhone || matchAltPhone || matchEmail || matchGstin
    }

    return true
  })

  const handleOpenPayment = (customer: any) => {
    // Pick first due invoice for this customer
    if (customer.dueInvoices && customer.dueInvoices.length > 0) {
      const inv = customer.dueInvoices[0]
      setCollectInvoice({
        ...inv,
        customers: {
          customer_name: customer.customer_name,
          phone_number: customer.phone_number,
        },
      })
      setIsPaymentModalOpen(true)
    }
  }

  const handlePaymentSuccess = (updatedInvoice: any) => {
    // Update local customers state
    setCustomers((prev) =>
      prev.map((c) => {
        if (!c.invoices) return c
        const updatedInvoices = c.invoices.map((inv: any) =>
          inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv
        )
        return { ...c, invoices: updatedInvoices }
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Customer Directory &amp; Outstanding Dues</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Customer Management
          </h1>
          <p className="text-sm text-slate-500">
            Review 360-degree customer records, monitor customer-wise outstanding dues, and collect payments.
          </p>
        </div>

        <Link
          href="/dashboard/customers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </Link>
      </div>

      {/* KPI Cards: Total Customers, Total Outstanding Dues, Customers with Dues, Cleared Customers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-primary">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalCustomersCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered customer base</div>
        </div>

        {/* Total Customer Dues */}
        <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Total Customer Dues</span>
            </span>
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-300 mt-1">
            {formatCurrency(totalOutstandingCustomerDues)}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
            Owed across {customersWithDuesCount} customers
          </div>
        </div>

        {/* Clients with Dues Count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Dues</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
            {customersWithDuesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {customersWithDuesCount > 0 ? 'Follow-up or collect slots' : 'No pending customer dues!'}
          </div>
        </div>

        {/* Settled / Cleared Count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">All Cleared</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {clearedCustomersCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Zero balance accounts</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Customers ({totalCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('DUE')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filterMode === 'DUE'
                ? 'bg-rose-500 text-white shadow-xs font-bold'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
            }`}
          >
            <span>Customers with Dues ({customersWithDuesCount})</span>
            {customersWithDuesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('CLEARED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterMode === 'CLEARED'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
            }`}
          >
            Cleared ({clearedCustomersCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone, GSTIN..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email / GSTIN</th>
                <th className="p-4 text-center">Invoices</th>
                <th className="p-4 text-right">Total Billed</th>
                <th className="p-4 text-right">Outstanding Due</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No customers found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const invoiceCount = c.invoices?.length || 0

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 pl-6">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-primary flex items-center justify-center font-bold text-xs">
                            {c.customer_name?.substring(0, 2).toUpperCase() || 'CU'}
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/customers/${c.id}`}
                              className="hover:text-primary transition font-bold"
                            >
                              {c.customer_name}
                            </Link>
                            {c.address && (
                              <div className="text-[11px] font-normal text-slate-400 truncate max-w-xs">
                                {c.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {c.phone_number ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.phone_number}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                        {c.email && (
                          <div className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {c.email}
                          </div>
                        )}
                        {c.gstin && (
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            GSTIN: {c.gstin}
                          </div>
                        )}
                        {!c.email && !c.gstin && '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          <FileText className="w-3 h-3" />
                          {invoiceCount}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(c.totalBilled)}
                      </td>
                      <td className="p-4 text-right">
                        {c.hasDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-mono">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {formatCurrency(c.totalDue)} Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cleared</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.hasDue && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
                              title="Collect payment on oldest due bill"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Collect</span>
                            </button>
                          )}
                          <Link
                            href={`/dashboard/customers/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>360 Profile</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Collection Modal */}
      <PaymentCollectionModal
        invoice={collectInvoice}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setCollectInvoice(null)
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
