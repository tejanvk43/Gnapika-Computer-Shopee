'use client'

import React, { useState, useEffect } from 'react'
import {
  CrmLead,
  CrmActivity,
  AmcContract,
  LeadStatus,
  LeadSource,
  ActivityType,
  buildWhatsAppUrl,
  WhatsAppTemplateType,
} from '@/lib/crm'
import {
  Users,
  Target,
  Phone,
  MessageCircle,
  Plus,
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Receipt,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  Laptop,
  Briefcase,
  AlertTriangle,
  RotateCw,
} from 'lucide-react'
import Link from 'next/link'

interface CrmDashboardProps {
  initialLeads: CrmLead[]
  initialActivities: CrmActivity[]
  initialAmcs: AmcContract[]
  customers: {
    id: string
    customer_name: string
    phone_number?: string | null
    email?: string | null
    company_name?: string | null
    address?: string | null
    balance_due?: number
    customer_type?: string
    credit_limit?: number
    gstin?: string | null
  }[]
  currentUserId?: string
}

const STAGES: { id: LeadStatus; label: string; color: string; bg: string }[] = [
  { id: 'New Lead', label: 'New Lead', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  { id: 'Contacted', label: 'Contacted', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  { id: 'Quote Sent', label: 'Quote Sent', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  { id: 'Negotiation', label: 'Negotiation', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
  { id: 'Won', label: 'Won / Converted', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  { id: 'Lost', label: 'Lost', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700' },
]

export function CrmDashboard({
  initialLeads,
  initialActivities,
  initialAmcs,
  customers,
  currentUserId,
}: CrmDashboardProps) {
  // State
  const [activeTab, setActiveTab] = useState<'pipeline' | 'amc' | 'followups' | 'customers'>('pipeline')
  const [leads, setLeads] = useState<CrmLead[]>(initialLeads)
  const [activities, setActivities] = useState<CrmActivity[]>(initialActivities)
  const [amcs, setAmcs] = useState<AmcContract[]>(initialAmcs)
  const [customersList, setCustomersList] = useState<any[]>(customers || [])

  useEffect(() => {
    setCustomersList(customers || [])
  }, [customers])

  const refreshCustomers = async () => {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setCustomersList(data.map((c: any) => ({
            ...c,
            company_name: c.gstin || '',
            customer_type: 'Regular',
            balance_due: c.invoices?.reduce((sum: number, inv: any) => sum + (parseFloat(inv.balance_due) || 0), 0) || 0,
            credit_limit: 0,
          })))
        }
      }
    } catch (err) {
      console.warn('Customer live refresh notice:', err)
    }
  }

  // Modals
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [isAddAmcOpen, setIsAddAmcOpen] = useState(false)
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false)
  const [activeCustomerForAction, setActiveCustomerForAction] = useState<any | null>(null)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)

  // Search
  const [leadSearch, setLeadSearch] = useState('')
  const [amcSearch, setAmcSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  // Form States - Lead
  const [leadForm, setLeadForm] = useState({
    title: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    company_name: '',
    source: 'Walk-in' as LeadSource,
    estimated_value: '',
    expected_close_date: '',
    notes: '',
    customer_id: '',
  })
  const [submittingLead, setSubmittingLead] = useState(false)

  // Form States - AMC
  const [amcForm, setAmcForm] = useState({
    customer_id: '',
    contract_title: '',
    contract_number: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    contract_value: '',
    billing_frequency: 'Annual',
    service_visits_allowed: '4',
    covered_devices_count: '1',
    covered_devices_details: '',
  })
  const [submittingAmc, setSubmittingAmc] = useState(false)

  // Form States - Activity / Follow-up
  const [activityForm, setActivityForm] = useState({
    customer_id: '',
    lead_id: '',
    activity_type: 'Call' as ActivityType,
    summary: '',
    details: '',
    follow_up_date: '',
    follow_up_time: '',
  })
  const [submittingActivity, setSubmittingActivity] = useState(false)

  // Format currency
  const formatCur = (val: number) => {
    return `₹${val.toLocaleString('en-IN')}`
  }

  // KPIs
  const totalPipelineValue = leads
    .filter((l) => l.status !== 'Lost' && l.status !== 'Won')
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0)

  const activeAmcCount = amcs.filter((a) => a.status === 'Active' || a.status === 'Expiring Soon').length
  const expiringAmcCount = amcs.filter((a) => a.status === 'Expiring Soon').length

  const todayStr = new Date().toISOString().slice(0, 10)
  const pendingFollowUps = activities.filter(
    (a) => a.follow_up_status === 'Pending' && a.follow_up_date
  )

  // Handle Create Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadForm.title || !leadForm.contact_name || !leadForm.contact_phone) return

    setSubmittingLead(true)
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm),
      })
      const json = await res.json()
      if (res.ok && json.lead) {
        setLeads((prev) => [json.lead, ...prev])
        setIsAddLeadOpen(false)
        refreshCustomers()
        setLeadForm({
          title: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          company_name: '',
          source: 'Walk-in',
          estimated_value: '',
          expected_close_date: '',
          notes: '',
          customer_id: '',
        })
      }
    } catch (err) {
      console.error('Error creating lead:', err)
    } finally {
      setSubmittingLead(false)
    }
  }

  // Handle Advance Lead Stage
  const handleAdvanceStage = async (leadId: string, newStatus: LeadStatus) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    )

    try {
      await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          id: leadId,
          status: newStatus,
        }),
      })
    } catch (err) {
      console.error('Error updating lead status:', err)
    }
  }

  // Handle Create AMC Contract
  const handleCreateAmc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amcForm.customer_id || !amcForm.contract_title) return

    setSubmittingAmc(true)
    try {
      const res = await fetch('/api/crm/amc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(amcForm),
      })
      const json = await res.json()
      if (res.ok && json.contract) {
        setAmcs((prev) => [json.contract, ...prev])
        setIsAddAmcOpen(false)
        setAmcForm({
          customer_id: '',
          contract_title: '',
          contract_number: '',
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
          contract_value: '',
          billing_frequency: 'Annual',
          service_visits_allowed: '4',
          covered_devices_count: '1',
          covered_devices_details: '',
        })
      }
    } catch (err) {
      console.error('Error creating AMC:', err)
    } finally {
      setSubmittingAmc(false)
    }
  }

  // Handle Record AMC Maintenance Visit
  const handleRecordAmcVisit = async (contractId: string) => {
    setAmcs((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? { ...c, service_visits_completed: (c.service_visits_completed || 0) + 1 }
          : c
      )
    )

    try {
      await fetch('/api/crm/amc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_visit', id: contractId }),
      })
    } catch (err) {
      console.error('Error recording AMC visit:', err)
    }
  }

  // Handle Log Activity
  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityForm.summary) return

    setSubmittingActivity(true)
    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityForm),
      })
      const json = await res.json()
      if (res.ok && json.activity) {
        setActivities((prev) => [json.activity, ...prev])
        setIsLogActivityOpen(false)
        setActivityForm({
          customer_id: '',
          lead_id: '',
          activity_type: 'Call',
          summary: '',
          details: '',
          follow_up_date: '',
          follow_up_time: '',
        })
      }
    } catch (err) {
      console.error('Error logging activity:', err)
    } finally {
      setSubmittingActivity(false)
    }
  }

  // Handle Complete Follow-up
  const handleCompleteFollowUp = async (activityId: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, follow_up_status: 'Completed' } : a))
    )

    try {
      await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_followup',
          id: activityId,
          status: 'Completed',
        }),
      })
    } catch (err) {
      console.error('Error completing follow-up:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Top CRM Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Customer Relationship Management (CRM)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                Gnapika Terminal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sales pipeline &amp; lead tracking, AMC contracts, customer interactions, follow-up reminders, and 1-click WhatsApp alerts
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddLeadOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Sales Inquiry</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddAmcOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>New AMC Contract</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLogActivityOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Log Interaction / Call</span>
            </button>
          </div>
        </div>

        {/* 2. Executive CRM Ribbon Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Active Pipeline Deals
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {leads.filter((l) => l.status !== 'Lost' && l.status !== 'Won').length} Inquiries
            </div>
            <div className="text-[11px] text-slate-400">
              Value: {formatCur(totalPipelineValue)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Active AMC Contracts
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {activeAmcCount} Contracts
            </div>
            <div className="text-[11px] text-slate-400">
              {expiringAmcCount > 0 ? (
                <span className="text-amber-500 font-bold">{expiringAmcCount} expiring soon</span>
              ) : (
                'All up to date'
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Pending Follow-Ups
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingFollowUps.length} Reminders
            </div>
            <div className="text-[11px] text-slate-400">Calls &amp; visits scheduled</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Customer Directory
            </div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {customersList.length} Accounts
            </div>
            <div className="text-[11px] text-slate-400">B2B, Retail &amp; AMC clients</div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl self-start">
        {[
          { id: 'pipeline', label: 'Sales & Inquiry Pipeline', icon: Target },
          { id: 'amc', label: 'AMC Maintenance Contracts', icon: ShieldCheck },
          { id: 'followups', label: 'Follow-ups & Task Reminders', icon: Clock },
          { id: 'customers', label: 'Customer 360 & Credit Terms', icon: Users },
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
              {tab.id === 'followups' && pendingFollowUps.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {pendingFollowUps.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: KANBAN SALES PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pipeline Stages ({leads.length} Leads)
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search inquiries, contacts..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
            {STAGES.map((stage) => {
              const stageLeads = leads
                .filter((l) => l.status === stage.id)
                .filter((l) => {
                  const q = leadSearch.toLowerCase()
                  return (
                    l.title.toLowerCase().includes(q) ||
                    l.contact_name.toLowerCase().includes(q) ||
                    l.contact_phone.includes(q) ||
                    (l.company_name && l.company_name.toLowerCase().includes(q))
                  )
                })

              const stageValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0)

              return (
                <div
                  key={stage.id}
                  className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 min-h-[450px] flex flex-col shadow-xs"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {stageLeads.length}
                      </span>
                    </div>
                  </div>

                  {stageValue > 0 && (
                    <div className="text-[11px] font-mono text-slate-500 mb-2">
                      Est: {formatCur(stageValue)}
                    </div>
                  )}

                  {/* Cards */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {stageLeads.map((lead) => {
                      const waUrl = buildWhatsAppUrl(lead.contact_phone, 'general_greeting', {
                        customerName: lead.contact_name,
                      })

                      return (
                        <div
                          key={lead.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:shadow-md transition space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              {lead.title}
                            </h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                              {lead.source}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            <div className="font-semibold">{lead.contact_name}</div>
                            {lead.company_name && (
                              <div className="text-[10px] text-slate-400">{lead.company_name}</div>
                            )}
                            <div className="font-mono text-[10px] text-slate-400">
                              {lead.contact_phone}
                            </div>
                          </div>

                          {lead.estimated_value > 0 && (
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatCur(lead.estimated_value)}
                            </div>
                          )}

                          {lead.notes && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                              "{lead.notes}"
                            </p>
                          )}

                          {/* Quick Card Actions */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${lead.contact_phone}`}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                title="Call contact"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600"
                                title="WhatsApp chat"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Stage Mover Selector */}
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                handleAdvanceStage(lead.id, e.target.value as LeadStatus)
                              }
                              className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  ➔ {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}

                    {stageLeads.length === 0 && (
                      <div className="py-8 text-center text-[11px] text-slate-400">
                        No inquiries in {stage.label}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AMC MAINTENANCE CONTRACTS */}
      {activeTab === 'amc' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Annual Maintenance Contracts ({amcs.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-system corporate AMC agreements, routine maintenance schedules &amp; renewal tracking
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search AMC #, customer, title..."
                  value={amcSearch}
                  onChange={(e) => setAmcSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddAmcOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary/90 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New AMC</span>
              </button>
            </div>
          </div>

          {/* AMC Contracts Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Contract #</th>
                    <th className="py-3 px-4">Client / Company</th>
                    <th className="py-3 px-4">Agreement Title</th>
                    <th className="py-3 px-4">Period &amp; Expiry</th>
                    <th className="py-3 px-4 text-center">Visits Done</th>
                    <th className="py-3 px-4 text-right">Value (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {amcs
                    .filter((a) => {
                      const q = amcSearch.toLowerCase()
                      return (
                        a.contract_number.toLowerCase().includes(q) ||
                        a.contract_title.toLowerCase().includes(q) ||
                        (a.customer_name && a.customer_name.toLowerCase().includes(q))
                      )
                    })
                    .map((amc) => {
                      const renewalWa = buildWhatsAppUrl(amc.customer_phone || '', 'amc_renewal', {
                        customerName: amc.customer_name,
                        contractNumber: amc.contract_number,
                        contractTitle: amc.contract_title,
                        expiryDate: amc.end_date,
                      })

                      const visitWa = buildWhatsAppUrl(
                        amc.customer_phone || '',
                        'amc_visit_schedule',
                        {
                          customerName: amc.customer_name,
                          visitsDone: amc.service_visits_completed,
                          visitsAllowed: amc.service_visits_allowed,
                        }
                      )

                      return (
                        <tr key={amc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary">
                            {amc.contract_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {amc.customer_name || 'Client'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {amc.customer_phone || '-'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {amc.contract_title}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {amc.covered_devices_count} Covered Systems ({amc.billing_frequency})
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div>Start: {amc.start_date}</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              End: {amc.end_date}
                            </div>
                            {amc.days_to_expiry !== undefined && (
                              <div
                                className={`text-[10px] font-bold ${
                                  amc.days_to_expiry < 0
                                    ? 'text-red-600'
                                    : amc.days_to_expiry <= 30
                                    ? 'text-amber-500'
                                    : 'text-slate-400'
                                }`}
                              >
                                {amc.days_to_expiry < 0
                                  ? 'Expired'
                                  : `${amc.days_to_expiry} days remaining`}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 font-mono font-bold text-xs">
                              <span className="text-emerald-600">
                                {amc.service_visits_completed}
                              </span>
                              <span className="text-slate-400">/</span>
                              <span>{amc.service_visits_allowed}</span>
                            </div>
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => handleRecordAmcVisit(amc.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                                title="Click when technician performs a routine maintenance check"
                              >
                                + Record Visit
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCur(amc.contract_value)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                amc.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : amc.status === 'Expiring Soon'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              }`}
                            >
                              {amc.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {amc.customer_phone && (
                                <>
                                  <a
                                    href={renewalWa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                                    title="Send AMC Renewal Reminder on WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={visitWa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                                    title="Send Maintenance Schedule notice on WhatsApp"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </a>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                  {amcs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        No AMC maintenance agreements found. Click "+ New AMC" to register one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FOLLOW-UPS & REMINDERS */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Follow-Ups &amp; Call Reminders ({pendingFollowUps.length} Pending)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scheduled client callbacks, site visit appointments, and quote discussions
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLogActivityOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary/90 transition self-start sm:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Follow-Up</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingFollowUps.map((act) => {
              const waUrl = buildWhatsAppUrl(act.customer_phone || '', 'general_greeting', {
                customerName: act.customer_name,
              })

              return (
                <div
                  key={act.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {act.activity_type}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{act.follow_up_date}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {act.summary}
                    </h4>
                    {act.details && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {act.details}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                        {act.customer_name || 'Customer'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {act.customer_phone || '-'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {act.customer_phone && (
                        <>
                          <a
                            href={`tel:${act.customer_phone}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100"
                            title="Call customer"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 hover:bg-emerald-50"
                            title="WhatsApp chat"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCompleteFollowUp(act.id)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[10px] transition"
                        title="Mark follow-up done"
                      >
                        ✓ Done
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {pendingFollowUps.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                No pending follow-ups scheduled! All customer tasks are completed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER 360 & CREDIT TERMS */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Customer Relationship Profiles ({customersList.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage B2B vs Retail classifications, credit limits, payment terms &amp; instant WhatsApp messaging
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, company..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customersList
              .filter((c) => {
                const q = customerSearch.toLowerCase()
                return (
                  (c.customer_name || '').toLowerCase().includes(q) ||
                  (c.phone_number && c.phone_number.includes(q)) ||
                  (c.company_name && c.company_name.toLowerCase().includes(q))
                )
              })
              .map((c) => {
                const isOverdue = (c.balance_due || 0) > 0
                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {c.customer_name}
                        </h4>
                        {c.company_name && (
                          <div className="text-[11px] text-slate-500 font-semibold">
                            {c.company_name}
                          </div>
                        )}
                        <div className="text-xs font-mono text-slate-400 mt-0.5">
                          {c.phone_number || 'No phone'}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {c.customer_type || 'Retail Walk-in'}
                      </span>
                    </div>

                    {/* Credit Status */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex justify-between">
                      <span className="text-slate-500">Balance Due:</span>
                      <span
                        className={`font-mono font-bold ${
                          isOverdue ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCur(c.balance_due || 0)}
                      </span>
                    </div>

                    {/* Quick Communication Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCustomerForAction(c)
                          setIsWhatsAppModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp Menu</span>
                      </button>

                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Full 360 View</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: ADD SALES INQUIRY / LEAD                    */}
      {/* ==================================================== */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Add Sales Inquiry / Lead
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLeadOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Account (Link from Bills / Services)
                </label>
                <select
                  value={leadForm.customer_id}
                  onChange={(e) => {
                    const custId = e.target.value
                    if (!custId) {
                      setLeadForm({ ...leadForm, customer_id: '' })
                      return
                    }
                    const found = customersList.find((c) => c.id === custId)
                    if (found) {
                      setLeadForm({
                        ...leadForm,
                        customer_id: found.id,
                        contact_name: found.customer_name || leadForm.contact_name,
                        contact_phone: found.phone_number || leadForm.contact_phone,
                        company_name: found.company_name || found.gstin || leadForm.company_name,
                        contact_email: found.email || leadForm.contact_email,
                      })
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                >
                  <option value="">-- New Customer / Enter Details Below --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} {c.phone_number ? `(${c.phone_number})` : ''} {c.gstin ? `[${c.gstin}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Inquiry Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 Office Desktop PCs Setup / 8-Cam CCTV Project"
                  value={leadForm.title}
                  onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Customer contact name"
                    value={leadForm.contact_name}
                    onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={leadForm.contact_phone}
                    onChange={(e) => setLeadForm({ ...leadForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="Optional business name"
                    value={leadForm.company_name}
                    onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={leadForm.source}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, source: e.target.value as LeadSource })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    {['Walk-in', 'Phone Call', 'WhatsApp', 'Quotation Inquiry', 'Reference', 'Website'].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 85000"
                    value={leadForm.estimated_value}
                    onChange={(e) => setLeadForm({ ...leadForm, estimated_value: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={leadForm.expected_close_date}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, expected_close_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Requirements &amp; Discussion Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Details regarding customer configuration, RAM/SSD specs, brands preferred..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLead}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submittingLead ? 'Saving...' : 'Add Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ADD AMC CONTRACT                             */}
      {/* ==================================================== */}
      {isAddAmcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Create Annual Maintenance Contract (AMC)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAmcOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAmc} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Organization (Synchronized from Bills / Services) *
                </label>
                <select
                  required
                  value={amcForm.customer_id}
                  onChange={(e) => setAmcForm({ ...amcForm, customer_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  <option value="">Select customer account...</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} {c.company_name ? `(${c.company_name})` : ''} {c.phone_number ? `- ${c.phone_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract Agreement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual IT Support & Network Maintenance (12 Computers)"
                  value={amcForm.contract_title}
                  onChange={(e) => setAmcForm({ ...amcForm, contract_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={amcForm.start_date}
                    onChange={(e) => setAmcForm({ ...amcForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date (Expiry) *
                  </label>
                  <input
                    type="date"
                    required
                    value={amcForm.end_date}
                    onChange={(e) => setAmcForm({ ...amcForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contract Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={amcForm.contract_value}
                    onChange={(e) => setAmcForm({ ...amcForm, contract_value: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visits Included
                  </label>
                  <input
                    type="number"
                    value={amcForm.service_visits_allowed}
                    onChange={(e) =>
                      setAmcForm({ ...amcForm, service_visits_allowed: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Devices Covered
                  </label>
                  <input
                    type="number"
                    value={amcForm.covered_devices_count}
                    onChange={(e) =>
                      setAmcForm({ ...amcForm, covered_devices_count: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAmcOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAmc}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submittingAmc ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: LOG INTERACTION / SCHEDULE FOLLOW-UP        */}
      {/* ==================================================== */}
      {isLogActivityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Log Customer Interaction / Follow-Up
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogActivityOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogActivity} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Activity Type
                  </label>
                  <select
                    value={activityForm.activity_type}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        activity_type: e.target.value as ActivityType,
                      })
                    }
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Account (Synchronized from Bills / Services)
                  </label>
                  <select
                    value={activityForm.customer_id}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, customer_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                  >
                    <option value="">-- No specific customer (General follow-up) --</option>
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} {c.phone_number ? `(${c.phone_number})` : ''} {c.balance_due > 0 ? `• Due: ₹${c.balance_due}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Summary / Discussion Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discussed RAM upgrade quotation; client requested 3-day hold"
                  value={activityForm.summary}
                  onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context from phone call or in-store conversation..."
                  value={activityForm.details}
                  onChange={(e) => setActivityForm({ ...activityForm, details: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-amber-600 block mb-2">
                  ⏰ Schedule Follow-up Callback / Reminder (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-500 mb-1">Follow-Up Date</label>
                    <input
                      type="date"
                      value={activityForm.follow_up_date}
                      onChange={(e) =>
                        setActivityForm({ ...activityForm, follow_up_date: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={activityForm.follow_up_time}
                      onChange={(e) =>
                        setActivityForm({ ...activityForm, follow_up_time: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogActivityOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingActivity}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submittingActivity ? 'Saving...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: 1-CLICK WHATSAPP COMMUNICATION TEMPLATES    */}
      {/* ==================================================== */}
      {isWhatsAppModalOpen && activeCustomerForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Send WhatsApp Message
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    To {activeCustomerForAction.customer_name} ({activeCustomerForAction.phone_number})
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
                Select Communication Template:
              </span>

              {/* Template 1: Payment Reminder */}
              <a
                href={buildWhatsAppUrl(
                  activeCustomerForAction.phone_number,
                  'payment_reminder',
                  {
                    customerName: activeCustomerForAction.customer_name,
                    balanceDue: activeCustomerForAction.balance_due || 0,
                    invoiceNumber: 'Recent Bill',
                  }
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700">
                  💳 Payment &amp; Balance Due Reminder
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Sends polite notice of outstanding dues: ₹
                  {(activeCustomerForAction.balance_due || 0).toFixed(2)}
                </div>
              </a>

              {/* Template 2: Service Ready Alert */}
              <a
                href={buildWhatsAppUrl(activeCustomerForAction.phone_number, 'service_ready', {
                  customerName: activeCustomerForAction.customer_name,
                  deviceModel: 'Computer / Laptop',
                  grandTotal: 1500,
                  serviceRefNumber: 'Latest Job',
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
                  Alerts customer that repaired device is tested &amp; ready to collect
                </div>
              </a>

              {/* Template 3: Quotation Follow-up */}
              <a
                href={buildWhatsAppUrl(
                  activeCustomerForAction.phone_number,
                  'quotation_followup',
                  {
                    customerName: activeCustomerForAction.customer_name,
                    companyName: activeCustomerForAction.company_name,
                    quotationNumber: 'Recent Quote',
                    grandTotal: 50000,
                  }
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-700">
                  📑 Quotation Follow-up &amp; Negotiation
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Follows up on quotation pricing and approval
                </div>
              </a>

              {/* Template 4: AMC Renewal Alert */}
              <a
                href={buildWhatsAppUrl(activeCustomerForAction.phone_number, 'amc_renewal', {
                  customerName: activeCustomerForAction.customer_name,
                  contractNumber: 'AMC Agreement',
                  contractTitle: 'Annual IT Support',
                  expiryDate: 'End of Month',
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
                  Reminds corporate/institutional client to renew their annual contract
                </div>
              </a>

              {/* Template 5: General Greeting */}
              <a
                href={buildWhatsAppUrl(
                  activeCustomerForAction.phone_number,
                  'general_greeting',
                  {
                    customerName: activeCustomerForAction.customer_name,
                  }
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition group"
              >
                <div className="font-bold text-slate-900 dark:text-white">
                  👋 General Customer Inquiry / Greeting
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Opens standard WhatsApp chat with Gnapika Computer Services signature
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
