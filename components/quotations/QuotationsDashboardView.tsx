'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { QuotationData } from '@/lib/quotations'
import { printQuotation } from '@/lib/quotationPrinter'
import {
  FileText,
  Building2,
  Plus,
  Search,
  Filter,
  Printer,
  Eye,
  Calendar,
  X,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

interface QuotationsDashboardViewProps {
  quotations: QuotationData[]
  isOwner: boolean
  companySummary: Array<{ name: string; quoteCount: number; totalValue: number }>
}

export function QuotationsDashboardView({
  quotations,
  isOwner,
  companySummary,
}: QuotationsDashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)

  // Filter quotations by search term and selected company
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // 1. Company Filter
      if (selectedCompany) {
        if (q.company_name?.toLowerCase().trim() !== selectedCompany.toLowerCase().trim()) {
          return false
        }
      }

      // 2. Search Filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim()
        const matchName = q.quotation_name?.toLowerCase().includes(query)
        const matchNum = q.quotation_number?.toLowerCase().includes(query)
        const matchComp = q.company_name?.toLowerCase().includes(query)
        const matchItems = q.items?.some(
          (it) =>
            it.description?.toLowerCase().includes(query) ||
            it.specifications?.toLowerCase().includes(query)
        )
        return matchName || matchNum || matchComp || matchItems
      }

      return true
    })
  }, [quotations, selectedCompany, searchTerm])

  const totalValue = quotations.reduce((acc, q) => acc + (q.grand_total || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Estimations &amp; Quotations
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              GST Format
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse company quotations, filter by client, and print estimation sheets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isOwner ? (
            <Link
              href="/dashboard/quotations/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Quotation</span>
            </Link>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Staff View (Creation by Owner only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Quotations</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {quotations.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">All generated estimates</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Companies Quoted</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {companySummary.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Corporate &amp; institution clients</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Value Quoted</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            ₹ {totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cumulative estimates total</div>
        </div>
      </div>

      {/* Companies Interactive Filter Bar ("By clicking the company name the all the quotes should be shown") */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-primary" />
            <span>Filter By Company (Click company to view all its quotes)</span>
          </div>
          {selectedCompany && (
            <button
              onClick={() => setSelectedCompany(null)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
            >
              <span>Show All</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCompany(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedCompany === null
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Companies ({quotations.length})
          </button>

          {companySummary.map((c) => {
            const isSelected = selectedCompany?.toLowerCase() === c.name.toLowerCase()
            return (
              <button
                key={c.name}
                onClick={() => setSelectedCompany(isSelected ? null : c.name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/20 ring-2 ring-primary/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c.quoteCount}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Filter Pill & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by quote name, company, number, or hardware..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>

        {selectedCompany && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            <span>Filtered by: {selectedCompany}</span>
            <button onClick={() => setSelectedCompany(null)} className="hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Quotations List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {filteredQuotations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No quotations found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {selectedCompany
                ? `No past quotations found for "${selectedCompany}".`
                : 'No quotations have been generated yet.'}
            </p>
            {isOwner && (
              <Link
                href="/dashboard/quotations/new"
                className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Quotation</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Quote No.</th>
                  <th className="py-3 px-4">Quotation Name / Project</th>
                  <th className="py-3 px-4">Company Name (Bill to)</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredQuotations.map((q) => {
                  const itemsCount = q.items?.length || 0
                  const firstItem = q.items?.[0]?.description || 'Hardware Item'
                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        <Link href={`/dashboard/quotations/${q.id}`} className="hover:underline">
                          {q.quotation_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          <Link href={`/dashboard/quotations/${q.id}`} className="hover:underline">
                            {q.quotation_name}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {firstItem} {itemsCount > 1 ? `(+${itemsCount - 1} more)` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedCompany(q.company_name)}
                          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary transition text-left flex items-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary" />
                          <span className="hover:underline">{q.company_name}</span>
                        </button>
                        {q.company_gstin && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            GST: {q.company_gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {q.quotation_date}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {itemsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹ {(q.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {q.status || 'Issued'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/quotations/${q.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="View paper estimation"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => printQuotation(q)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Print quotation"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
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
  )
}
