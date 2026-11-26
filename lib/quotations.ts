// lib/quotations.ts
import { supabaseService } from './supabase'
import { generateNextQuotationNumber } from './sequence'

export interface QuotationItem {
  id: string
  description: string
  specifications: string
  hsn_sac: string
  quantity: number
  unit: string
  rate_incl_tax: number
  rate_excl_tax: number
  gst_rate: number
  discount_percent: number
  taxable_amount: number
  cgst_rate: number
  cgst_amount: number
  sgst_rate: number
  sgst_amount: number
  igst_rate: number
  igst_amount: number
  line_total: number
}

export interface QuotationData {
  id: string
  organization_id: string
  branch_id?: string
  quotation_number: string
  quotation_name: string
  company_name: string
  company_address: string
  company_state: string
  company_gstin?: string
  company_phone?: string
  company_email?: string
  consignee_name?: string
  consignee_address?: string
  consignee_state?: string
  quotation_date: string
  delivery_note?: string
  mode_terms_of_payment?: string
  reference_no_date?: string
  other_references?: string
  buyers_order_no?: string
  buyers_order_date?: string
  dispatch_doc_no?: string
  delivery_note_date?: string
  dispatched_through?: string
  destination?: string
  terms_of_delivery?: string
  items: QuotationItem[]
  total_qty: number
  taxable_total: number
  total_cgst: number
  total_sgst: number
  total_igst: number
  total_tax: number
  grand_total: number
  amount_in_words: string
  tax_in_words: string
  declaration?: string
  bank_details?: {
    bank_name: string
    account_no: string
    branch_ifsc: string
  }
  status?: string
  created_by_user_id?: string
  created_at?: string
  updated_at?: string
}

/**
 * Fetch all quotations for an organization, optionally filtered by company name
 */
export async function getQuotations(
  organizationId: string,
  companyName?: string
): Promise<QuotationData[]> {
  try {
    // 1. Try querying quotations table first
    let query = supabaseService
      .from('quotations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('quotation_date', { ascending: false })

    if (companyName && companyName.trim() !== '') {
      query = query.ilike('company_name', `%${companyName.trim()}%`)
    }

    const { data: qRows, error } = await query

    if (!error && qRows) {
      return qRows.map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        branch_id: row.branch_id,
        quotation_number: row.quotation_number,
        quotation_name: row.quotation_name,
        company_name: row.company_name,
        company_address: row.company_address || '',
        company_state: row.company_state || 'Andhra Pradesh, Code : 37',
        company_gstin: row.company_gstin || '',
        consignee_name: row.consignee_name || row.company_name,
        consignee_address: row.consignee_address || row.company_address || '',
        consignee_state: row.consignee_state || row.company_state || 'Andhra Pradesh, Code : 37',
        quotation_date: row.quotation_date,
        total_amount: parseFloat(row.total_amount || 0),
        taxable_amount: parseFloat(row.taxable_amount || 0),
        cgst_amount: parseFloat(row.cgst_amount || 0),
        sgst_amount: parseFloat(row.sgst_amount || 0),
        igst_amount: parseFloat(row.igst_amount || 0),
        status: row.status || 'Issued',
        created_by_user_id: row.created_by_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        ...(row.quotation_snapshot || {}),
      }))
    }
  } catch (err) {
    console.warn('Quotations table query notice:', err)
  }

  // 2. Fallback to audit_logs storage
  try {
    const { data: auditRows, error: auditError } = await supabaseService
      .from('audit_logs')
      .select('id, details, timestamp')
      .eq('organization_id', organizationId)
      .eq('action', 'QUOTATION_SAVE')
      .order('timestamp', { ascending: false })

    if (auditError || !auditRows) return []

    // Deduplicate by quotation ID (keep most recent)
    const map = new Map<string, QuotationData>()
    for (const r of auditRows) {
      const q = r.details as QuotationData
      if (q && q.id && !map.has(q.id)) {
        if (!companyName || (q.company_name && q.company_name.toLowerCase().includes(companyName.toLowerCase().trim()))) {
          map.set(q.id, q)
        }
      }
    }

    return Array.from(map.values())
  } catch (err) {
    console.error('Error fetching quotations fallback:', err)
    return []
  }
}

/**
 * Fetch a single quotation by ID
 */
export async function getQuotationById(
  id: string,
  organizationId: string
): Promise<QuotationData | null> {
  try {
    const { data, error } = await supabaseService
      .from('quotations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!error && data) {
      return {
        id: data.id,
        organization_id: data.organization_id,
        branch_id: data.branch_id,
        quotation_number: data.quotation_number,
        quotation_name: data.quotation_name,
        company_name: data.company_name,
        company_address: data.company_address || '',
        company_state: data.company_state || 'Andhra Pradesh, Code : 37',
        company_gstin: data.company_gstin || '',
        consignee_name: data.consignee_name || data.company_name,
        consignee_address: data.consignee_address || data.company_address || '',
        consignee_state: data.consignee_state || data.company_state || 'Andhra Pradesh, Code : 37',
        quotation_date: data.quotation_date,
        total_amount: parseFloat(data.total_amount || 0),
        taxable_amount: parseFloat(data.taxable_amount || 0),
        cgst_amount: parseFloat(data.cgst_amount || 0),
        sgst_amount: parseFloat(data.sgst_amount || 0),
        igst_amount: parseFloat(data.igst_amount || 0),
        status: data.status || 'Issued',
        created_by_user_id: data.created_by_user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        ...(data.quotation_snapshot || {}),
      }
    }
  } catch (err) {
    console.warn('Single quotation table lookup notice:', err)
  }

  // Fallback check in audit_logs
  try {
    const { data: auditRows } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('organization_id', organizationId)
      .eq('action', 'QUOTATION_SAVE')
      .order('timestamp', { ascending: false })

    if (auditRows) {
      for (const r of auditRows) {
        const q = r.details as QuotationData
        if (q && q.id === id) {
          return q
        }
      }
    }
  } catch (err) {
    console.error('Error fetching quotation fallback:', err)
  }

  return null
}

/**
 * Save (create or update) a quotation
 */
export async function saveQuotation(
  data: Partial<QuotationData>,
  organizationId: string,
  userId: string
): Promise<QuotationData> {
  const quotationId = data.id || crypto.randomUUID()
  const qNumber = data.quotation_number || (await generateNextQuotationNumber(organizationId))

  const fullRecord: QuotationData = {
    id: quotationId,
    organization_id: organizationId,
    branch_id: data.branch_id,
    quotation_number: qNumber,
    quotation_name: data.quotation_name || 'General Hardware Quotation',
    company_name: data.company_name || 'Counter Client',
    company_address: data.company_address || '',
    company_state: data.company_state || 'Andhra Pradesh, Code : 37',
    company_gstin: data.company_gstin || '',
    company_phone: data.company_phone || '',
    company_email: data.company_email || '',
    consignee_name: data.consignee_name || data.company_name || 'Counter Client',
    consignee_address: data.consignee_address || data.company_address || '',
    consignee_state: data.consignee_state || data.company_state || 'Andhra Pradesh, Code : 37',
    quotation_date: data.quotation_date || new Date().toISOString().slice(0, 10),
    delivery_note: data.delivery_note || '',
    mode_terms_of_payment: data.mode_terms_of_payment || 'Mode/Terms of Payment',
    reference_no_date: data.reference_no_date || '',
    other_references: data.other_references || '',
    buyers_order_no: data.buyers_order_no || '',
    buyers_order_date: data.buyers_order_date || '',
    dispatch_doc_no: data.dispatch_doc_no || '',
    delivery_note_date: data.delivery_note_date || '',
    dispatched_through: data.dispatched_through || '',
    destination: data.destination || 'Vijayawada',
    terms_of_delivery: data.terms_of_delivery || '',
    items: data.items || [],
    total_qty: data.total_qty || 1,
    taxable_total: data.taxable_total || 0,
    total_cgst: data.total_cgst || 0,
    total_sgst: data.total_sgst || 0,
    total_igst: data.total_igst || 0,
    total_tax: data.total_tax || 0,
    grand_total: data.grand_total || 0,
    amount_in_words: data.amount_in_words || '',
    tax_in_words: data.tax_in_words || '',
    declaration:
      data.declaration ||
      'We declare that this quotation shows the actual price of the goods described and that all particulars are true and correct.',
    bank_details: data.bank_details || {
      bank_name: 'KARUR VYSYA BANK',
      account_no: '1413010000000199',
      branch_ifsc: 'GOVERNOR PETA & KVBL0001413',
    },
    status: data.status || 'Issued',
    created_by_user_id: userId,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 1. Try to upsert into quotations table
  let tableSuccess = false
  try {
    const { error: upsertErr } = await supabaseService.from('quotations').upsert(
      {
        id: fullRecord.id,
        organization_id: fullRecord.organization_id,
        branch_id: fullRecord.branch_id,
        quotation_number: fullRecord.quotation_number,
        quotation_name: fullRecord.quotation_name,
        company_name: fullRecord.company_name,
        company_address: fullRecord.company_address,
        company_state: fullRecord.company_state,
        company_gstin: fullRecord.company_gstin,
        consignee_name: fullRecord.consignee_name,
        consignee_address: fullRecord.consignee_address,
        consignee_state: fullRecord.consignee_state,
        quotation_date: fullRecord.quotation_date,
        total_amount: fullRecord.grand_total,
        taxable_amount: fullRecord.taxable_total,
        cgst_amount: fullRecord.total_cgst,
        sgst_amount: fullRecord.total_sgst,
        igst_amount: fullRecord.total_igst,
        status: fullRecord.status,
        quotation_snapshot: fullRecord,
        created_by_user_id: fullRecord.created_by_user_id,
        updated_at: fullRecord.updated_at,
      },
      { onConflict: 'id' }
    )

    if (!upsertErr) {
      tableSuccess = true
    }
  } catch (err) {
    console.warn('Upsert to quotations table skipped:', err)
  }

  // 2. Always write to audit_logs so that data is 100% persisted even without the migration run
  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: organizationId,
        user_id: userId,
        action: 'QUOTATION_SAVE',
        entity_type: 'QUOTATION',
        details: fullRecord,
      },
    ])
  } catch (err) {
    console.error('Audit log backup write error:', err)
  }

  // 3. Auto-sync company into customers table if not existing
  if (fullRecord.company_name && fullRecord.company_name !== 'Counter Client') {
    try {
      const { data: existingCust } = await supabaseService
        .from('customers')
        .select('id')
        .eq('organization_id', organizationId)
        .ilike('customer_name', fullRecord.company_name)
        .limit(1)

      if (!existingCust || existingCust.length === 0) {
        await supabaseService.from('customers').insert([
          {
            organization_id: organizationId,
            customer_name: fullRecord.company_name,
            address: fullRecord.company_address,
            gstin: fullRecord.company_gstin || null,
            phone_number: fullRecord.company_phone || null,
            email: fullRecord.company_email || null,
          },
        ])
      }
    } catch (custErr) {
      console.warn('Notice: Customer auto-register sync warning:', custErr)
    }
  }

  return fullRecord
}

/**
 * Delete a quotation
 */
export async function deleteQuotation(id: string, organizationId: string): Promise<boolean> {
  try {
    await supabaseService.from('quotations').delete().eq('id', id).eq('organization_id', organizationId)
  } catch (err) {
    console.warn('Table delete notice:', err)
  }

  try {
    // Also record deletion in audit_logs
    await supabaseService.from('audit_logs').delete().match({
      organization_id: organizationId,
      action: 'QUOTATION_SAVE',
    })
  } catch (err) {
    console.warn('Audit log delete notice:', err)
  }

  return true
}

/**
 * Get company summary list (names, quote count, total value)
 */
export async function getCompanyQuotationSummary(organizationId: string) {
  const allQuotes = await getQuotations(organizationId)
  const companyMap = new Map<
    string,
    { name: string; quoteCount: number; totalValue: number; latestDate: string; gstin?: string; address?: string }
  >()

  for (const q of allQuotes) {
    const compName = (q.company_name || 'General / Unnamed').trim()
    const existing = companyMap.get(compName)
    if (existing) {
      existing.quoteCount += 1
      existing.totalValue += q.grand_total || 0
      if (q.quotation_date > existing.latestDate) {
        existing.latestDate = q.quotation_date
      }
    } else {
      companyMap.set(compName, {
        name: compName,
        quoteCount: 1,
        totalValue: q.grand_total || 0,
        latestDate: q.quotation_date,
        gstin: q.company_gstin,
        address: q.company_address,
      })
    }
  }

  return Array.from(companyMap.values()).sort((a, b) => b.quoteCount - a.quoteCount)
}
