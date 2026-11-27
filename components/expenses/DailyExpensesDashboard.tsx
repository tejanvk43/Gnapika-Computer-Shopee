// components/expenses/DailyExpensesDashboard.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Wallet,
  Plus,
  Calendar,
  Search,
  Trash2,
  TrendingDown,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
} from 'lucide-react'
import { DailyExpense, DateClusteredExpenses } from '@/lib/expenses'

const QUICK_REASONS = [
  'Tea & Refreshments for staff/clients',
  'Shop Cleaning Materials',
  'Printer Paper & Stationery',
  'Courier & Delivery Charges',
  'Soldering wire / Hardware tools',
  'Electricity / Utility Bill',
  'Shop Maintenance / Repair',
  'Staff Lunch / Snacks',
]

export default function DailyExpensesDashboard() {
  const [expenses, setExpenses] = useState<DailyExpense[]>([])
  const [clusters, setClusters] = useState<DateClusteredExpenses[]>([])
  const [stats, setStats] = useState({
    todayTotal: 0,
    weekTotal: 0,
    monthTotal: 0,
    overallTotal: 0,
    count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Add modal state - Only Reason, Cost, Date as requested
  const [showAddModal, setShowAddModal] = useState(false)
  const [newReason, setNewReason] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)

      let url = '/api/expenses?'
      const params = new URLSearchParams()

      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10)
        params.append('startDate', todayStr)
        params.append('endDate', todayStr)
      } else if (dateFilter === 'week') {
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        params.append('startDate', startOfWeek.toISOString().slice(0, 10))
      } else if (dateFilter === 'month') {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        params.append('startDate', startOfMonth.toISOString().slice(0, 10))
      } else if (dateFilter === 'custom') {
        if (customStartDate) params.append('startDate', customStartDate)
        if (customEndDate) params.append('endDate', customEndDate)
      }

      const res = await fetch(url + params.toString())
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch expenses')
      }

      setExpenses(data.expenses || [])
      setClusters(data.clusters || [])
      setStats(
        data.stats || {
          todayTotal: 0,
          weekTotal: 0,
          monthTotal: 0,
          overallTotal: 0,
          count: 0,
        }
      )
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error loading expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [dateFilter, customStartDate, customEndDate])

  // Client-side search filtering across clustered items
  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters

    const q = searchQuery.toLowerCase().trim()
    const result: DateClusteredExpenses[] = []

    for (const cluster of clusters) {
      const matchedItems = cluster.items.filter(
        (it) =>
          it.reason.toLowerCase().includes(q) ||
          it.cost.toString().includes(q)
      )

      if (matchedItems.length > 0) {
        const total = Math.round(matchedItems.reduce((acc, it) => acc + (it.cost || 0), 0) * 100) / 100
        result.push({
          ...cluster,
          items: matchedItems,
          totalCost: total,
        })
      }
    }

    return result
  }, [clusters, searchQuery])

  // Handle Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReason.trim()) {
      alert('Please enter a reason for the expense.')
      return
    }

    const costNum = parseFloat(newCost)
    if (isNaN(costNum) || costNum <= 0) {
      alert('Please enter a valid cost amount greater than 0.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: newReason.trim(),
          cost: costNum,
          expense_date: newDate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense')
      }

      setSuccessMsg('Expense recorded successfully!')
      setTimeout(() => setSuccessMsg(null), 3500)

      // Reset modal fields
      setNewReason('')
      setNewCost('')
      setShowAddModal(false)

      // Reload
      await fetchExpenses()
    } catch (err: any) {
      alert(err.message || 'Error saving expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Expense
  const handleDelete = async (id: string, reason: string) => {
    if (!confirm(`Are you sure you want to delete the expense: "${reason}"?`)) return

    try {
      setDeletingId(id)
      let res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      let data: any = null
      try {
        data = await res.json()
      } catch {}

      if (!res.ok) {
        // Fallback to query param on /api/expenses?id=...
        const fallbackRes = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
        try {
          data = await fallbackRes.json()
        } catch {}
        if (!fallbackRes.ok) {
          throw new Error(data?.error || 'Failed to delete expense')
        }
      }

      setSuccessMsg('Expense deleted successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
      await fetchExpenses()
    } catch (err: any) {
      alert(err.message || 'Error deleting expense')
    } finally {
      setDeletingId(null)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(val || 0)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-lg">
              <Wallet className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daily Expenses Tracker</h1>
            <span className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Owner Only
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Record and monitor daily operational expenses, shop purchases, and overheads clustered date-wise.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button
            onClick={() => {
              setNewDate(new Date().toISOString().slice(0, 10))
              setShowAddModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Today's Expenses</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(stats.todayTotal)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recorded for current date</p>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>This Week</span>
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(stats.weekTotal)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Since Sunday</p>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>This Month</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(stats.monthTotal)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Overall Filtered */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Shown</span>
            <Wallet className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(stats.overallTotal)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stats.count} recorded transactions</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reason, category, notes, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { label: 'All Time', val: 'all' },
                { label: 'Today', val: 'today' },
                { label: 'This Week', val: 'week' },
                { label: 'This Month', val: 'month' },
                { label: 'Custom', val: 'custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.val}
                onClick={() => setDateFilter(opt.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  dateFilter === opt.val
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker when 'custom' selected */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500">From Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <span className="text-xs font-semibold text-slate-500">To Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              onClick={() => fetchExpenses()}
              className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-800"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Date-wise Clustered View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading daily expenses...</p>
        </div>
      ) : filteredClusters.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-3">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
            <Wallet className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No expenses found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            {searchQuery
              ? 'No expenses matched your search query. Try clearing the search.'
              : 'There are no recorded expenses for the selected criteria. Click below to add an expense.'}
          </p>
          <button
            onClick={() => {
              setNewDate(new Date().toISOString().slice(0, 10))
              setShowAddModal(true)
            }}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredClusters.map((cluster) => (
            <div
              key={cluster.date}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Cluster Header */}
              <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    {cluster.formattedDate}
                  </span>
                  {cluster.relativeLabel && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        cluster.relativeLabel === 'Today'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {cluster.relativeLabel}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({cluster.items.length} {cluster.items.length === 1 ? 'entry' : 'entries'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Day Total:</span>
                  <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50">
                    {formatCurrency(cluster.totalCost)}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {cluster.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Reason */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-semibold text-slate-900 dark:text-white text-base leading-snug">
                        {item.reason}
                      </div>
                    </div>

                    {/* Cost and Delete Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.cost)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id, item.reason)}
                        disabled={deletingId === item.id}
                        title="Delete expense entry"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-lg">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">Add Daily Expense</h3>
                  <p className="text-xs text-slate-500">Record an expenditure for accounting & reference</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason / Description <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tea and biscuits for customer meeting"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />

                {/* Quick chip suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_REASONS.slice(0, 4).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setNewReason(r)}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      + {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Cost Amount (₹) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Expense Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Save Expense
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
