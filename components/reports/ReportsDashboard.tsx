'use client'

import React, { useState } from 'react'
import {
  FullReportsData,
  getPresetDateRanges,
  formatDate,
} from '@/lib/reports'
import {
  TrendingUp,
  Receipt,
  Wrench,
  Wallet,
  Calendar,
  Download,
  Printer,
  Search,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  Layers,
  PieChart,
  RefreshCw,
  Coins,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface ReportsDashboardProps {
  initialData: FullReportsData
}

export function ReportsDashboard({ initialData }: ReportsDashboardProps) {
  const [data, setData] = useState<FullReportsData>(initialData)
  const [loading, setLoading] = useState(false)

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'gst' | 'services' | 'expenses' | 'debtors'
  >('overview')

  // Date Filters
  const presets = getPresetDateRanges()
  const [selectedPreset, setSelectedPreset] = useState<string>(
    initialData.period.label === 'Today'
      ? 'today'
      : initialData.period.label === 'Yesterday'
      ? 'yesterday'
      : initialData.period.label === 'Last 7 Days'
      ? 'last7Days'
      : initialData.period.label === 'This Month'
      ? 'thisMonth'
      : initialData.period.label === 'Last Month'
      ? 'lastMonth'
      : initialData.period.label.startsWith('FY')
      ? 'financialYear'
      : 'custom'
  )
  const [customStart, setCustomStart] = useState(initialData.period.startDate)
  const [customEnd, setCustomEnd] = useState(initialData.period.endDate)

  // Search & Filter within tabs
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [debtorSearch, setDebtorSearch] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')

  // Fetch Reports for given dates
  const fetchReports = async (startDate: string, endDate: string, presetKey: string) => {
    setLoading(true)
    setSelectedPreset(presetKey)
    try {
      const res = await fetch(`/api/reports?start_date=${startDate}&end_date=${endDate}`)
      const json = await res.json()
      if (res.ok && json.data) {
        setData(json.data)
      }
    } catch (err) {
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Preset Click
  const handlePresetSelect = (key: string) => {
    if (key === 'today') {
      fetchReports(presets.today.start, presets.today.end, 'today')
    } else if (key === 'yesterday') {
      fetchReports(presets.yesterday.start, presets.yesterday.end, 'yesterday')
    } else if (key === 'last7Days') {
      fetchReports(presets.last7Days.start, presets.last7Days.end, 'last7Days')
    } else if (key === 'thisMonth') {
      fetchReports(presets.thisMonth.start, presets.thisMonth.end, 'thisMonth')
    } else if (key === 'lastMonth') {
      fetchReports(presets.lastMonth.start, presets.lastMonth.end, 'lastMonth')
    } else if (key === 'financialYear') {
      fetchReports(presets.financialYear.start, presets.financialYear.end, 'financialYear')
    } else {
      setSelectedPreset('custom')
    }
  }

  // Apply Custom Date Range
  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customStart || !customEnd) return
    fetchReports(customStart, customEnd, 'custom')
  }

  // Export current tab data to CSV
  const handleExportCSV = () => {
    let filename = `GCS_Report_${data.period.startDate}_to_${data.period.endDate}`
    let csvContent = 'data:text/csv;charset=utf-8,'

    if (activeTab === 'overview' || activeTab === 'gst') {
      filename = `GCS_GST_Invoices_${data.period.startDate}_to_${data.period.endDate}.csv`
      csvContent += 'Invoice Number,Date,Customer Name,Customer Phone,GSTIN,Type,Taxable Amount,CGST 9%,SGST 9%,Grand Total,Amount Paid,Balance Due,Payment Mode\n'
      for (const row of data.invoicesLedger) {
        const type = row.isServiceBill ? 'Service Bill' : 'Product Sales'
        const cleanCust = `"${(row.customerName || '').replace(/"/g, '""')}"`
        csvContent += `${row.invoiceNumber},${row.invoiceDate.slice(0, 10)},${cleanCust},${row.customerPhone || ''},${row.customerGstin || ''},${type},${row.taxableAmount.toFixed(2)},${row.cgstAmount.toFixed(2)},${row.sgstAmount.toFixed(2)},${row.grandTotal.toFixed(2)},${row.amountPaid.toFixed(2)},${row.balanceDue.toFixed(2)},${row.paymentMethod}\n`
      }
    } else if (activeTab === 'services') {
      filename = `GCS_Service_Jobs_${data.period.startDate}_to_${data.period.endDate}.csv`
      csvContent += 'Job Ref,Created Date,Customer,Phone,Device,Brand,Model,Status,Technician,Estimated Cost\n'
      for (const row of data.serviceReport.openJobs) {
        const cleanCust = `"${(row.customerName || '').replace(/"/g, '""')}"`
        const cleanBrand = `"${(row.companyBrand || '').replace(/"/g, '""')}"`
        const cleanModel = `"${(row.model || '').replace(/"/g, '""')}"`
        csvContent += `${row.serviceRefNumber},${row.createdAt.slice(0, 10)},${cleanCust},${row.customerPhone},${row.deviceType},${cleanBrand},${cleanModel},${row.status},${row.technicianName},${row.estimatedCost}\n`
      }
    } else if (activeTab === 'expenses') {
      filename = `GCS_Cash_Flow_${data.period.startDate}_to_${data.period.endDate}.csv`
      csvContent += 'Date,Sales Collections,Expenses,Net Cash Margin\n'
      for (const row of data.cashFlowMatrix) {
        csvContent += `${row.date},${row.totalCollections.toFixed(2)},${row.dailyExpenses.toFixed(2)},${row.netMargin.toFixed(2)}\n`
      }
    } else if (activeTab === 'debtors') {
      filename = `GCS_Outstanding_Dues_${data.period.endDate}.csv`
      csvContent += 'Invoice Number,Date,Customer Name,Phone,Grand Total,Amount Paid,Balance Due,Age (Days),Category\n'
      for (const row of data.outstandingDebtors) {
        const cleanCust = `"${(row.customerName || '').replace(/"/g, '""')}"`
        csvContent += `${row.invoiceNumber},${row.invoiceDate.slice(0, 10)},${cleanCust},${row.customerPhone},${row.grandTotal.toFixed(2)},${row.amountPaid.toFixed(2)},${row.balanceDue.toFixed(2)},${row.ageInDays},${row.agingCategory}\n`
      }
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Report Handler
  const handlePrint = () => {
    window.print()
  }

  // Filtered lists
  const filteredInvoices = data.invoicesLedger.filter((inv) => {
    const q = ledgerSearch.toLowerCase()
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerPhone && inv.customerPhone.includes(q)) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q))
    )
  })

  const filteredDebtors = data.outstandingDebtors.filter((d) => {
    const q = debtorSearch.toLowerCase()
    return (
      d.customerName.toLowerCase().includes(q) ||
      d.customerPhone.includes(q) ||
      d.invoiceNumber.toLowerCase().includes(q)
    )
  })

  const filteredOpenJobs = data.serviceReport.openJobs.filter((job) => {
    const q = serviceSearch.toLowerCase()
    return (
      job.serviceRefNumber.toLowerCase().includes(q) ||
      job.customerName.toLowerCase().includes(q) ||
      job.customerPhone.includes(q) ||
      job.companyBrand.toLowerCase().includes(q) ||
      job.deviceType.toLowerCase().includes(q)
    )
  })

  // Format currency
  const formatCur = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const { kpis } = data

  return (
    <div className="space-y-6">
      {/* 1. Header & Period Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <PieChart className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Business Reports &amp; Analytics
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                Gnapika Terminal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Financial performance, GST compliance, service center metrics, daily expenses, and customer credit recovery
            </p>
          </div>

          {/* Action Buttons: Export CSV & Print */}
          <div className="flex items-center gap-2 self-start lg:self-center print:hidden">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs"
              title="Download clean CSV of active report"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs"
              title="Print report for filing or tax audit"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={() => fetchReports(data.period.startDate, data.period.endDate, selectedPreset)}
              disabled={loading}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Date Filter Strip */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last7Days', label: 'Last 7 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'lastMonth', label: 'Last Month' },
              { id: 'financialYear', label: presets.financialYear.label },
              { id: 'custom', label: 'Custom' },
            ].map((p) => {
              const active = selectedPreset === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Active Period Label / Custom Range Selector */}
          {selectedPreset === 'custom' ? (
            <form onSubmit={handleApplyCustom} className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg text-xs font-bold transition hover:opacity-90"
              >
                Apply
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>
                {data.period.startDate} to {data.period.endDate} ({data.period.label})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Executive KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Gross Invoiced Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Gross Revenue</span>
            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCur(kpis.grossRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.invoicesCount} total bills issued
          </div>
        </div>

        {/* KPI 2: Total Collections */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Collections</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCur(kpis.totalCollections)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Actual cash/online received
          </div>
        </div>

        {/* KPI 3: Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Store Expenses</span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCur(kpis.totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Shop operational costs
          </div>
        </div>

        {/* KPI 4: Net Profit / Cash Surplus */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Net Margin</span>
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-xl font-black tracking-tight ${
              kpis.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600'
            }`}
          >
            {formatCur(kpis.netProfit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.profitMarginPercent}% of collections
          </div>
        </div>

        {/* KPI 5: Market Outstanding (Debtors) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Outstanding Due</span>
            <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {formatCur(kpis.totalReceivables)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {data.outstandingDebtors.length} credit customers
          </div>
        </div>

        {/* KPI 6: Active Service Workshop Jobs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Pending Repairs</span>
            <div className="p-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
            {kpis.pendingServicesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {kpis.completedServicesCount} completed in queue
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl self-start print:hidden">
        {[
          { id: 'overview', label: 'Overview & Trends', icon: Layers },
          { id: 'gst', label: 'GST & Invoicing Ledger', icon: FileSpreadsheet },
          { id: 'services', label: 'Service Center Workshop', icon: Wrench },
          { id: 'expenses', label: 'Daily Expenses & Cash Flow', icon: Wallet },
          { id: 'debtors', label: 'Credit Recovery & Debtors', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                active
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 text-primary" />
              <span>{tab.label}</span>
              {tab.id === 'debtors' && data.outstandingDebtors.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {data.outstandingDebtors.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue Stream Breakdown: Sales vs Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Computer Accessories &amp; Hardware Sales
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {kpis.grossRevenue > 0
                    ? Math.round((kpis.productSalesRevenue / kpis.grossRevenue) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCur(kpis.productSalesRevenue)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generated across {kpis.salesInvoicesCount} product sales tax invoices
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                <span className="text-slate-500">Avg Sales Invoice Value</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCur(
                    kpis.salesInvoicesCount > 0
                      ? kpis.productSalesRevenue / kpis.salesInvoicesCount
                      : 0
                  )}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Service Center &amp; Repair Revenue
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-purple-600">
                  {kpis.grossRevenue > 0
                    ? Math.round((kpis.serviceRevenue / kpis.grossRevenue) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCur(kpis.serviceRevenue)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Collected from {kpis.serviceBillsCount} delivered &amp; billed repair tickets
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                <span className="text-slate-500">Avg Service Bill Charge</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCur(data.serviceReport.avgTicketValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Payment Methods Breakdown (Collections)
            </h3>
            {data.paymentMethods.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No payment data recorded in this period.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.paymentMethods.map((pm) => (
                  <div
                    key={pm.method}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">{pm.method}</span>
                      <span className="font-mono text-primary font-bold">{pm.percentage}%</span>
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {formatCur(pm.amount)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {pm.count} transactions
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${pm.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Trend Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daily Revenue, Collections &amp; Expenses Activity
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {data.dailyTrends.length} active dates
              </span>
            </div>

            {data.dailyTrends.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No transactions recorded in this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Invoiced (₹)</th>
                      <th className="py-2.5 px-3 text-right">Collections (₹)</th>
                      <th className="py-2.5 px-3 text-right">Expenses (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net Margin (₹)</th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {data.dailyTrends.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          <span className="font-bold">{d.formattedDate}</span>{' '}
                          <span className="text-[11px] text-slate-400 font-mono">({d.dayName})</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCur(d.totalInvoiced)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatCur(d.collections)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                          {d.expenses > 0 ? formatCur(d.expenses) : '-'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold ${
                            d.netCash >= 0 ? 'text-indigo-600' : 'text-red-600'
                          }`}
                        >
                          {formatCur(d.netCash)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {d.invoicesCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GST & INVOICING LEDGER */}
      {activeTab === 'gst' && (
        <div className="space-y-6">
          {/* GSTR-1 Tax Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  GSTR-1 &amp; Audit Ready
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  GST Tax Liability &amp; Turnover Summary
                </h2>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="self-start sm:self-center px-4 py-2 rounded-xl bg-white text-slate-950 text-xs font-bold shadow-md hover:bg-slate-100 transition inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export GST Summary (CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Total Taxable Turnover
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {formatCur(data.gstReport.totalTaxable)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Base taxable amount</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  CGST (Central Tax 9%)
                </div>
                <div className="text-2xl font-black text-blue-300 mt-1">
                  {formatCur(data.gstReport.totalCgst)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Central Government Share</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  SGST (State Tax 9%)
                </div>
                <div className="text-2xl font-black text-blue-300 mt-1">
                  {formatCur(data.gstReport.totalSgst)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">State Government Share</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Total GST Collected
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {formatCur(data.gstReport.totalTax)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">CGST + SGST total</div>
              </div>
            </div>

            {/* B2B vs B2C Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/10 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="flex justify-between font-bold text-white mb-1">
                  <span>B2B Invoices (Registered with GSTIN)</span>
                  <span className="font-mono text-amber-300">
                    {data.gstReport.b2bInvoicesCount} Invoices
                  </span>
                </div>
                <div className="text-slate-300">
                  Taxable: {formatCur(data.gstReport.b2bTaxable)} | Tax: {formatCur(data.gstReport.b2bTax)} | Total: {formatCur(data.gstReport.b2bTotal)}
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="flex justify-between font-bold text-white mb-1">
                  <span>B2C Retail Invoices (Consumers)</span>
                  <span className="font-mono text-emerald-300">
                    {data.gstReport.b2cInvoicesCount} Invoices
                  </span>
                </div>
                <div className="text-slate-300">
                  Taxable: {formatCur(data.gstReport.b2cTaxable)} | Tax: {formatCur(data.gstReport.b2cTax)} | Total: {formatCur(data.gstReport.b2cTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Invoices Detailed Ledger */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Invoices Tax Ledger ({filteredInvoices.length} entries)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Itemized invoices with taxable value and GST breakdown
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice, customer, GSTIN..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No invoices match the search filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Customer &amp; GSTIN</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3 text-right">Taxable (₹)</th>
                      <th className="py-3 px-3 text-right">CGST (₹)</th>
                      <th className="py-3 px-3 text-right">SGST (₹)</th>
                      <th className="py-3 px-3 text-right">Total (₹)</th>
                      <th className="py-3 px-3 text-right">Paid (₹)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          <Link
                            href={`/dashboard/billing`}
                            className="hover:text-primary transition"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {inv.invoiceDate.slice(0, 10)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {inv.customerName}
                          </div>
                          {inv.customerGstin && (
                            <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-semibold">
                              GST: {inv.customerGstin}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.isServiceBill
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {inv.isServiceBill ? 'Service' : 'Product'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {formatCur(inv.taxableAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatCur(inv.cgstAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatCur(inv.sgstAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCur(inv.grandTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">
                          {formatCur(inv.amountPaid)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {inv.isFullyPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Paid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Due: {formatCur(inv.balanceDue)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE CENTER WORKSHOP */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Service Center Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Service Jobs
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {data.serviceReport.totalJobs}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">All repair tickets registered</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Delivered &amp; Billed
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {data.serviceReport.deliveredJobs + data.serviceReport.completedJobs}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Successful repairs</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Pending Workshop Repairs
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {data.serviceReport.pendingJobs}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Devices currently in queue</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Average Repair Charge
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {formatCur(data.serviceReport.avgTicketValue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Per delivered service ticket</div>
            </div>
          </div>

          {/* Device Types Serviced Badges */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Devices Serviced by Category
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.serviceReport.deviceTypeCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span>{type}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Open & Pending Repair Tickets Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Open Service Jobs Queue ({filteredOpenJobs.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Devices pending diagnosis, repair completion, or customer delivery
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search job, customer, brand..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>
            </div>

            {filteredOpenJobs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                All service repair jobs are up to date! No pending tickets in queue.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-3 px-3">Job Ref #</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Device &amp; Model</th>
                      <th className="py-3 px-3">Problem Description</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Assigned Tech</th>
                      <th className="py-3 px-3 text-center">Age (Days)</th>
                      <th className="py-3 px-3 text-right">Est. Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredOpenJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-primary">
                          <Link href={`/dashboard/services`} className="hover:underline">
                            {job.serviceRefNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {job.customerName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {job.customerPhone}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {job.companyBrand} {job.model}
                          </span>
                          <div className="text-[11px] text-slate-400">{job.deviceType}</div>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                          {job.problemDescription}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.status === 'Received'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : job.status === 'Diagnosing'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : job.status === 'In Progress'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : job.status === 'Waiting for Parts'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {job.technicianName}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.ageInDays > 7
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800'
                            }`}
                          >
                            {job.ageInDays}d
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {job.estimatedCost > 0 ? formatCur(job.estimatedCost) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DAILY EXPENSES & CASH FLOW */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Expenses & Cash Flow Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daily Cash Flow &amp; Expense Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daily cash inflow (sales &amp; services) minus store expenses = Net Cash Generated
                </p>
              </div>

              <Link
                href="/dashboard/expenses"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90 transition self-start sm:self-center"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Manage Expenses</span>
              </Link>
            </div>

            {data.cashFlowMatrix.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No cash flow or expense records in this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Inflow / Collections (₹)</th>
                      <th className="py-3 px-3 text-right">Store Expenses (₹)</th>
                      <th className="py-3 px-3 text-right">Net Margin Generated (₹)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {data.cashFlowMatrix.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {row.formattedDate}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatCur(row.totalCollections)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          {row.dailyExpenses > 0 ? formatCur(row.dailyExpenses) : '-'}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-black ${
                            row.netMargin >= 0
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCur(row.netMargin)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.netMargin >= 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            }`}
                          >
                            {row.netMargin >= 0 ? '+ Surplus' : '- Deficit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CREDIT & DEBTORS RECOVERY */}
      {activeTab === 'debtors' && (
        <div className="space-y-6">
          {/* Outstanding Summary Cards */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Debtors Ledger &amp; Capital Stuck
                </span>
                <h3 className="text-xl font-black text-amber-950 dark:text-amber-100 mt-0.5">
                  Total Outstanding Balance Due: {formatCur(kpis.totalReceivables)}
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Across {data.outstandingDebtors.length} customers with pending payments. Click WhatsApp to send an instant polite reminder.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="self-start sm:self-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Debtors List (CSV)</span>
              </button>
            </div>
          </div>

          {/* Debtors List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Pending Balance Due List ({filteredDebtors.length})
              </h3>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search debtor name, phone..."
                  value={debtorSearch}
                  onChange={(e) => setDebtorSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>
            </div>

            {filteredDebtors.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No pending customer balances found! All invoices are fully settled.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Invoice Date</th>
                      <th className="py-3 px-3 text-right">Grand Total (₹)</th>
                      <th className="py-3 px-3 text-right">Paid (₹)</th>
                      <th className="py-3 px-3 text-right">Balance Due (₹)</th>
                      <th className="py-3 px-3 text-center">Aging</th>
                      <th className="py-3 px-3 text-center">Recovery Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredDebtors.map((d) => {
                      const cleanPhone = (d.customerPhone || '').replace(/\D/g, '')
                      const waText = encodeURIComponent(
                        `Dear ${d.customerName}, this is a gentle reminder from Gnapika Computer Services regarding your pending balance of ₹${d.balanceDue.toFixed(
                          2
                        )} against Bill #${d.invoiceNumber}. Kindly arrange for payment at your earliest convenience. Thank you!`
                      )
                      const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${waText}` : '#'

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            <div>{d.customerName}</div>
                            <div className="text-[11px] text-slate-400 font-mono font-normal">
                              {d.customerPhone || 'No phone'}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-primary font-bold">
                            {d.invoiceNumber}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {d.invoiceDate.slice(0, 10)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium">
                            {formatCur(d.grandTotal)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-600">
                            {formatCur(d.amountPaid)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-rose-600">
                            {formatCur(d.balanceDue)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.agingCategory === '30+ Days'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                  : d.agingCategory === '7 - 30 Days'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800'
                              }`}
                            >
                              {d.ageInDays} days ({d.agingCategory})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {cleanPhone ? (
                                <>
                                  <a
                                    href={`tel:${cleanPhone}`}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                                    title={`Call ${d.customerName}`}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs"
                                    title="Send payment reminder on WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>Remind</span>
                                  </a>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-400">No contact</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
