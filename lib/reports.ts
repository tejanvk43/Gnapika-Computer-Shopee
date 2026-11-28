// lib/reports.ts
import { supabaseService } from './supabase'

export interface ReportDateFilter {
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  branchId?: string
}

export interface ExecutiveKPIs {
  grossRevenue: number
  productSalesRevenue: number
  serviceRevenue: number
  totalCollections: number
  totalExpenses: number
  netProfit: number
  profitMarginPercent: number
  totalReceivables: number
  invoicesCount: number
  serviceBillsCount: number
  salesInvoicesCount: number
  pendingServicesCount: number
  completedServicesCount: number
  quotationsCount: number
  totalQuotationsValue: number
}

export interface DailyTrendItem {
  date: string
  formattedDate: string
  dayName: string
  totalInvoiced: number
  collections: number
  expenses: number
  netCash: number
  invoicesCount: number
}

export interface PaymentMethodBreakdown {
  method: string
  amount: number
  count: number
  percentage: number
}

export interface GstTaxBreakdown {
  totalTaxable: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalTax: number
  b2bInvoicesCount: number
  b2bTaxable: number
  b2bTax: number
  b2bTotal: number
  b2cInvoicesCount: number
  b2cTaxable: number
  b2cTax: number
  b2cTotal: number
  taxSlabs: {
    slab: string
    taxable: number
    cgst: number
    sgst: number
    totalTax: number
  }[]
}

export interface InvoiceReportItem {
  id: string
  invoiceNumber: string
  invoiceDate: string
  isServiceBill: boolean
  customerName: string
  customerPhone: string
  customerGstin?: string
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  grandTotal: number
  amountPaid: number
  balanceDue: number
  paymentMethod: string
  isFullyPaid: boolean
}

export interface ServicePerformanceReport {
  totalJobs: number
  completedJobs: number
  pendingJobs: number
  deliveredJobs: number
  serviceRevenue: number
  avgTicketValue: number
  statusCounts: Record<string, number>
  deviceTypeCounts: Record<string, number>
  openJobs: {
    id: string
    serviceRefNumber: string
    createdAt: string
    ageInDays: number
    customerName: string
    customerPhone: string
    deviceType: string
    companyBrand: string
    model: string
    status: string
    problemDescription: string
    technicianName: string
    estimatedCost: number
  }[]
}

export interface CashFlowRow {
  date: string
  formattedDate: string
  salesCollections: number
  serviceCollections: number
  totalCollections: number
  dailyExpenses: number
  netMargin: number
  expensesCount: number
}

export interface OutstandingDebtor {
  id: string
  invoiceNumber: string
  invoiceDate: string
  isServiceBill: boolean
  customerName: string
  customerPhone: string
  customerAddress?: string
  grandTotal: number
  amountPaid: number
  balanceDue: number
  ageInDays: number
  agingCategory: '< 7 Days' | '7 - 30 Days' | '30+ Days'
  paymentMethod: string
}

export interface FullReportsData {
  organizationId: string
  period: {
    startDate: string
    endDate: string
    label: string
  }
  kpis: ExecutiveKPIs
  dailyTrends: DailyTrendItem[]
  paymentMethods: PaymentMethodBreakdown[]
  gstReport: GstTaxBreakdown
  invoicesLedger: InvoiceReportItem[]
  serviceReport: ServicePerformanceReport
  cashFlowMatrix: CashFlowRow[]
  outstandingDebtors: OutstandingDebtor[]
  quotationsSummary: {
    totalQuotes: number
    totalValue: number
    topCompanies: { companyName: string; quoteCount: number; totalValue: number }[]
  }
}

/**
 * Format date YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculate Financial Year Start and End (April 1st to March 31st)
 */
export function getFinancialYearRange(date: Date = new Date()): { start: string; end: string; label: string } {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1 - 12
  const fyStartYear = month >= 4 ? year : year - 1
  const fyEndYear = fyStartYear + 1
  return {
    start: `${fyStartYear}-04-01`,
    end: `${fyEndYear}-03-31`,
    label: `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`,
  }
}

/**
 * Helper to build date range filter labels
 */
export function getPresetDateRanges() {
  const today = new Date()
  const todayStr = formatDate(today)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDate(yesterday)

  const last7Days = new Date(today)
  last7Days.setDate(last7Days.getDate() - 6)
  const last7DaysStr = formatDate(last7Days)

  const firstDayThisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const lastDayThisMonth = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))

  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const firstDayLastMonth = formatDate(lastMonthDate)
  const lastDayLastMonth = formatDate(new Date(today.getFullYear(), today.getMonth(), 0))

  const fy = getFinancialYearRange(today)

  return {
    today: { start: todayStr, end: todayStr, label: 'Today' },
    yesterday: { start: yesterdayStr, end: yesterdayStr, label: 'Yesterday' },
    last7Days: { start: last7DaysStr, end: todayStr, label: 'Last 7 Days' },
    thisMonth: { start: firstDayThisMonth, end: lastDayThisMonth, label: 'This Month' },
    lastMonth: { start: firstDayLastMonth, end: lastDayLastMonth, label: 'Last Month' },
    financialYear: { start: fy.start, end: fy.end, label: fy.label },
  }
}

/**
 * Main Data Fetching and Aggregation for Reports Dashboard
 */
export async function getReportsDashboardData(
  organizationId: string,
  filter?: ReportDateFilter
): Promise<FullReportsData> {
  const presets = getPresetDateRanges()
  const startDate = filter?.startDate || presets.thisMonth.start
  const endDate = filter?.endDate || presets.thisMonth.end

  // Label derivation
  let periodLabel = 'Custom Period'
  if (startDate === presets.today.start && endDate === presets.today.end) periodLabel = 'Today'
  else if (startDate === presets.yesterday.start && endDate === presets.yesterday.end) periodLabel = 'Yesterday'
  else if (startDate === presets.last7Days.start && endDate === presets.last7Days.end) periodLabel = 'Last 7 Days'
  else if (startDate === presets.thisMonth.start && endDate === presets.thisMonth.end) periodLabel = 'This Month'
  else if (startDate === presets.lastMonth.start && endDate === presets.lastMonth.end) periodLabel = 'Last Month'
  else if (startDate === presets.financialYear.start && endDate === presets.financialYear.end) periodLabel = presets.financialYear.label

  // 1. Fetch Invoices for date period
  let invQuery = supabaseService
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_grand_amount,
      amount_paid,
      balance_due,
      payment_method,
      invoice_snapshot,
      customer_id,
      customers (
        customer_name,
        phone_number,
        gstin,
        address
      )
    `)
    .eq('organization_id', organizationId)
    .gte('invoice_date', `${startDate}T00:00:00.000Z`)
    .lte('invoice_date', `${endDate}T23:59:59.999Z`)
    .order('invoice_date', { ascending: false })

  if (filter?.branchId) {
    invQuery = invQuery.eq('branch_id', filter.branchId)
  }

  const { data: rawInvoices, error: invErr } = await invQuery
  if (invErr) {
    console.error('Error fetching invoices for reports:', invErr)
  }
  const invoices = rawInvoices || []

  // 2. Fetch Outstanding Invoices (All time where balance_due > 0)
  const { data: rawOutstanding } = await supabaseService
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_grand_amount,
      amount_paid,
      balance_due,
      payment_method,
      invoice_snapshot,
      customers (
        customer_name,
        phone_number,
        address
      )
    `)
    .eq('organization_id', organizationId)
    .gt('balance_due', 0)
    .order('invoice_date', { ascending: false })

  const allOutstandingInvoices = rawOutstanding || []

  // 3. Fetch Service Jobs (All time and in period)
  const { data: rawServices } = await supabaseService
    .from('service_jobs')
    .select(`
      id,
      service_ref_number,
      created_at,
      device_type,
      company_brand,
      model,
      status,
      problem_description,
      estimated_cost,
      actual_cost,
      customers (
        customer_name,
        phone_number
      ),
      user_profiles!service_jobs_assigned_technician_id_fkey (
        full_name
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  const allServices = rawServices || []

  // 4. Fetch Daily Expenses for period
  let expQuery = supabaseService
    .from('daily_expenses')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })

  const { data: rawExpenses } = await expQuery
  const expenses = rawExpenses || []

  // 5. Fetch Quotations for period
  let quotQuery = supabaseService
    .from('quotations')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('quotation_date', startDate)
    .lte('quotation_date', endDate)

  const { data: rawQuotations } = await quotQuery
  const quotations = rawQuotations || []

  // ==========================================
  // AGGREGATION & CALCULATIONS
  // ==========================================

  let grossRevenue = 0
  let productSalesRevenue = 0
  let serviceRevenue = 0
  let totalCollections = 0
  let serviceBillsCount = 0
  let salesInvoicesCount = 0

  let totalTaxable = 0
  let totalCgst = 0
  let totalSgst = 0
  let totalIgst = 0
  let b2bInvoicesCount = 0
  let b2bTaxable = 0
  let b2bTax = 0
  let b2bTotal = 0
  let b2cInvoicesCount = 0
  let b2cTaxable = 0
  let b2cTax = 0
  let b2cTotal = 0

  const paymentMethodsMap: Record<string, { amount: number; count: number }> = {}
  const dailyTrendsMap: Record<
    string,
    { totalInvoiced: number; collections: number; expenses: number; invoicesCount: number }
  > = {}

  const invoicesLedger: InvoiceReportItem[] = []

  for (const inv of invoices) {
    const grand = parseFloat(inv.total_grand_amount) || 0
    const paid = parseFloat(inv.amount_paid) || 0
    const due = parseFloat(inv.balance_due) || 0
    const snapshot = (inv.invoice_snapshot as any) || {}
    const isService = Boolean(snapshot.is_service_bill || inv.invoice_number?.includes('-SER'))

    grossRevenue += grand
    totalCollections += paid

    if (isService) {
      serviceRevenue += grand
      serviceBillsCount++
    } else {
      productSalesRevenue += grand
      salesInvoicesCount++
    }

    // Payment Methods
    const pMethod = (inv.payment_method || 'Cash').trim()
    if (!paymentMethodsMap[pMethod]) {
      paymentMethodsMap[pMethod] = { amount: 0, count: 0 }
    }
    paymentMethodsMap[pMethod].amount += paid > 0 ? paid : grand
    paymentMethodsMap[pMethod].count += 1

    // GST & Taxable details
    // Check if snapshot contains tax info, else calculate 18% inclusive / exclusive
    let taxable = 0
    let cgst = 0
    let sgst = 0

    if (snapshot.taxable_amount !== undefined && snapshot.gst_amount !== undefined) {
      taxable = parseFloat(snapshot.taxable_amount) || 0
      const totalGstVal = parseFloat(snapshot.gst_amount) || 0
      cgst = Math.round((totalGstVal / 2) * 100) / 100
      sgst = Math.round((totalGstVal / 2) * 100) / 100
    } else if (snapshot.subtotal !== undefined && snapshot.gst_amount !== undefined) {
      taxable = parseFloat(snapshot.subtotal) || 0
      const totalGstVal = parseFloat(snapshot.gst_amount) || 0
      cgst = Math.round((totalGstVal / 2) * 100) / 100
      sgst = Math.round((totalGstVal / 2) * 100) / 100
    } else if (Array.isArray(snapshot.items) && snapshot.items.length > 0) {
      for (const item of snapshot.items) {
        taxable += parseFloat(item.taxable_amount) || 0
      }
      const totalGstVal = Math.max(0, grand - taxable)
      cgst = Math.round((totalGstVal / 2) * 100) / 100
      sgst = Math.round((totalGstVal / 2) * 100) / 100
    } else {
      // Standard 18% GST estimate: Taxable = Grand / 1.18
      taxable = Math.round((grand / 1.18) * 100) / 100
      const totalGstVal = Math.round((grand - taxable) * 100) / 100
      cgst = Math.round((totalGstVal / 2) * 100) / 100
      sgst = Math.round((totalGstVal / 2) * 100) / 100
    }

    totalTaxable += taxable
    totalCgst += cgst
    totalSgst += sgst

    const custGstin = (inv.customers as any)?.gstin?.trim() || ''
    const hasGstin = Boolean(custGstin && custGstin.length >= 10)
    const invTax = cgst + sgst

    if (hasGstin) {
      b2bInvoicesCount++
      b2bTaxable += taxable
      b2bTax += invTax
      b2bTotal += grand
    } else {
      b2cInvoicesCount++
      b2cTaxable += taxable
      b2cTax += invTax
      b2cTotal += grand
    }

    // Daily map
    const dateKey = inv.invoice_date.slice(0, 10)
    if (!dailyTrendsMap[dateKey]) {
      dailyTrendsMap[dateKey] = { totalInvoiced: 0, collections: 0, expenses: 0, invoicesCount: 0 }
    }
    dailyTrendsMap[dateKey].totalInvoiced += grand
    dailyTrendsMap[dateKey].collections += paid
    dailyTrendsMap[dateKey].invoicesCount += 1

    invoicesLedger.push({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      isServiceBill: isService,
      customerName: (inv.customers as any)?.customer_name || 'Walk-in Customer',
      customerPhone: (inv.customers as any)?.phone_number || '-',
      customerGstin: custGstin || undefined,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      grandTotal: grand,
      amountPaid: paid,
      balanceDue: due,
      paymentMethod: inv.payment_method || 'Cash',
      isFullyPaid: due <= 0,
    })
  }

  // Aggregate Expenses
  let totalExpenses = 0
  for (const exp of expenses) {
    const cost = parseFloat(exp.cost) || 0
    totalExpenses += cost

    const dateKey = exp.expense_date
    if (!dailyTrendsMap[dateKey]) {
      dailyTrendsMap[dateKey] = { totalInvoiced: 0, collections: 0, expenses: 0, invoicesCount: 0 }
    }
    dailyTrendsMap[dateKey].expenses += cost
  }

  // Total Outstanding Receivables (Market Dues)
  let totalReceivables = 0
  const outstandingDebtors: OutstandingDebtor[] = []
  const todayMs = new Date().getTime()

  for (const inv of allOutstandingInvoices) {
    const grand = parseFloat(inv.total_grand_amount) || 0
    const paid = parseFloat(inv.amount_paid) || 0
    const due = parseFloat(inv.balance_due) || 0
    if (due <= 0) continue

    totalReceivables += due

    const invDate = new Date(inv.invoice_date)
    const diffTime = Math.abs(todayMs - invDate.getTime())
    const ageInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let agingCategory: '< 7 Days' | '7 - 30 Days' | '30+ Days' = '< 7 Days'
    if (ageInDays > 30) agingCategory = '30+ Days'
    else if (ageInDays >= 7) agingCategory = '7 - 30 Days'

    const snapshot = (inv.invoice_snapshot as any) || {}
    const isService = Boolean(snapshot.is_service_bill || inv.invoice_number?.includes('-SER'))

    outstandingDebtors.push({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      isServiceBill: isService,
      customerName: (inv.customers as any)?.customer_name || 'Customer',
      customerPhone: (inv.customers as any)?.phone_number || '',
      customerAddress: (inv.customers as any)?.address || '',
      grandTotal: grand,
      amountPaid: paid,
      balanceDue: due,
      ageInDays,
      agingCategory,
      paymentMethod: inv.payment_method || 'Due / Credit',
    })
  }

  // Sort debtors by balance due descending
  outstandingDebtors.sort((a, b) => b.balanceDue - a.balanceDue)

  // Service Jobs Analysis
  let pendingServicesCount = 0
  let completedServicesCount = 0
  let deliveredServicesCount = 0
  const statusCounts: Record<string, number> = {}
  const deviceTypeCounts: Record<string, number> = {}
  const openJobsList: ServicePerformanceReport['openJobs'] = []

  // Filter service jobs within period for period counts, and check overall pending jobs
  for (const job of allServices) {
    const status = (job.status || 'Received').trim()
    statusCounts[status] = (statusCounts[status] || 0) + 1

    const devType = (job.device_type || 'Laptop').trim()
    deviceTypeCounts[devType] = (deviceTypeCounts[devType] || 0) + 1

    const isPending = !['Completed', 'Delivered', 'Cancelled'].includes(status)
    if (isPending) {
      pendingServicesCount++
      const jobDate = new Date(job.created_at)
      const diffTime = Math.abs(todayMs - jobDate.getTime())
      const ageInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      openJobsList.push({
        id: job.id,
        serviceRefNumber: job.service_ref_number,
        createdAt: job.created_at,
        ageInDays,
        customerName: (job.customers as any)?.customer_name || 'Customer',
        customerPhone: (job.customers as any)?.phone_number || '',
        deviceType: job.device_type,
        companyBrand: job.company_brand,
        model: job.model,
        status: job.status,
        problemDescription: job.problem_description,
        technicianName: (job.user_profiles as any)?.full_name || 'Unassigned',
        estimatedCost: parseFloat(job.estimated_cost) || 0,
      })
    } else if (status === 'Completed') {
      completedServicesCount++
    } else if (status === 'Delivered') {
      deliveredServicesCount++
    }
  }

  // Sort open jobs by creation date
  openJobsList.sort((a, b) => b.ageInDays - a.ageInDays)

  // Net Profit & Profit Margin
  const netProfit = totalCollections - totalExpenses
  const profitMarginPercent =
    totalCollections > 0 ? Math.round((netProfit / totalCollections) * 1000) / 10 : 0

  // Build Daily Trends Array
  const dailyTrends: DailyTrendItem[] = Object.keys(dailyTrendsMap)
    .sort()
    .map((dStr) => {
      const item = dailyTrendsMap[dStr]
      const dObj = new Date(dStr)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const formattedDate = `${dObj.getDate()} ${months[dObj.getMonth()]}`
      const dayName = days[dObj.getDay()]

      return {
        date: dStr,
        formattedDate,
        dayName,
        totalInvoiced: item.totalInvoiced,
        collections: item.collections,
        expenses: item.expenses,
        netCash: item.collections - item.expenses,
        invoicesCount: item.invoicesCount,
      }
    })

  // Build Cash Flow Matrix
  const cashFlowMatrix: CashFlowRow[] = Object.keys(dailyTrendsMap)
    .sort((a, b) => b.localeCompare(a)) // latest first
    .map((dStr) => {
      const item = dailyTrendsMap[dStr]
      const dObj = new Date(dStr)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const formattedDate = `${dObj.getDate()} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`

      return {
        date: dStr,
        formattedDate,
        salesCollections: item.collections,
        serviceCollections: 0,
        totalCollections: item.collections,
        dailyExpenses: item.expenses,
        netMargin: item.collections - item.expenses,
        expensesCount: expenses.filter((e) => e.expense_date === dStr).length,
      }
    })

  // Payment Methods Array
  const totalPaymentSum = Object.values(paymentMethodsMap).reduce((s, m) => s + m.amount, 0)
  const paymentMethods: PaymentMethodBreakdown[] = Object.entries(paymentMethodsMap).map(
    ([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: totalPaymentSum > 0 ? Math.round((data.amount / totalPaymentSum) * 100) : 0,
    })
  )
  paymentMethods.sort((a, b) => b.amount - a.amount)

  // GST Tax Breakdown
  const totalTax = totalCgst + totalSgst + totalIgst
  const gstReport: GstTaxBreakdown = {
    totalTaxable: Math.round(totalTaxable * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalIgst: Math.round(totalIgst * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    b2bInvoicesCount,
    b2bTaxable: Math.round(b2bTaxable * 100) / 100,
    b2bTax: Math.round(b2bTax * 100) / 100,
    b2bTotal: Math.round(b2bTotal * 100) / 100,
    b2cInvoicesCount,
    b2cTaxable: Math.round(b2cTaxable * 100) / 100,
    b2cTax: Math.round(b2cTax * 100) / 100,
    b2cTotal: Math.round(b2cTotal * 100) / 100,
    taxSlabs: [
      {
        slab: '18% GST (Computer Accessories & Services)',
        taxable: Math.round(totalTaxable * 100) / 100,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
      },
    ],
  }

  // Quotations Summary
  let totalQuotesValue = 0
  const companyQuotesMap: Record<string, { count: number; value: number }> = {}
  for (const q of quotations) {
    const val = parseFloat(q.grand_total) || 0
    totalQuotesValue += val
    const comp = (q.company_name || 'General').trim()
    if (!companyQuotesMap[comp]) companyQuotesMap[comp] = { count: 0, value: 0 }
    companyQuotesMap[comp].count++
    companyQuotesMap[comp].value += val
  }

  const topCompanies = Object.entries(companyQuotesMap)
    .map(([companyName, d]) => ({
      companyName,
      quoteCount: d.count,
      totalValue: d.value,
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)

  // Service Performance Report
  const avgTicketValue =
    serviceBillsCount > 0 ? Math.round(serviceRevenue / serviceBillsCount) : 0

  const serviceReport: ServicePerformanceReport = {
    totalJobs: allServices.length,
    completedJobs: completedServicesCount,
    pendingJobs: pendingServicesCount,
    deliveredJobs: deliveredServicesCount,
    serviceRevenue,
    avgTicketValue,
    statusCounts,
    deviceTypeCounts,
    openJobs: openJobsList,
  }

  return {
    organizationId,
    period: {
      startDate,
      endDate,
      label: periodLabel,
    },
    kpis: {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      productSalesRevenue: Math.round(productSalesRevenue * 100) / 100,
      serviceRevenue: Math.round(serviceRevenue * 100) / 100,
      totalCollections: Math.round(totalCollections * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      profitMarginPercent,
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      invoicesCount: invoices.length,
      serviceBillsCount,
      salesInvoicesCount,
      pendingServicesCount,
      completedServicesCount,
      quotationsCount: quotations.length,
      totalQuotationsValue: Math.round(totalQuotesValue * 100) / 100,
    },
    dailyTrends,
    paymentMethods,
    gstReport,
    invoicesLedger,
    serviceReport,
    cashFlowMatrix,
    outstandingDebtors,
    quotationsSummary: {
      totalQuotes: quotations.length,
      totalValue: Math.round(totalQuotesValue * 100) / 100,
      topCompanies,
    },
  }
}
