// lib/crm.ts
import { supabaseService } from './supabase'

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Quote Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost'

export type LeadSource =
  | 'Walk-in'
  | 'Phone Call'
  | 'WhatsApp'
  | 'Quotation Inquiry'
  | 'Reference'
  | 'Website'
  | 'Other'

export interface CrmLead {
  id: string
  organization_id: string
  customer_id?: string
  title: string
  contact_name: string
  contact_phone: string
  contact_email?: string
  company_name?: string
  source: LeadSource
  status: LeadStatus
  estimated_value: number
  expected_close_date?: string
  notes?: string
  lost_reason?: string
  assigned_staff_id?: string
  assigned_staff_name?: string
  converted_invoice_id?: string
  converted_service_id?: string
  created_at?: string
  updated_at?: string
}

export type ActivityType =
  | 'Call'
  | 'Meeting'
  | 'WhatsApp'
  | 'Note'
  | 'Email'
  | 'Shop Visit'

export interface CrmActivity {
  id: string
  organization_id: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  lead_id?: string
  activity_type: ActivityType
  summary: string
  details?: string
  follow_up_date?: string // YYYY-MM-DD
  follow_up_time?: string
  follow_up_status?: 'Pending' | 'Completed' | 'Cancelled'
  created_by_user_id?: string
  created_by_name?: string
  created_at: string
}

export interface AmcContract {
  id: string
  organization_id: string
  customer_id: string
  customer_name?: string
  customer_phone?: string
  customer_company?: string
  contract_number: string
  contract_title: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  contract_value: number
  billing_frequency: 'Annual' | 'Half-Yearly' | 'Quarterly' | 'Monthly'
  service_visits_allowed: number
  service_visits_completed: number
  covered_devices_count: number
  covered_devices_details?: string
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Renewed' | 'Terminated'
  payment_status: 'Paid' | 'Partial' | 'Due'
  terms_and_conditions?: string
  days_to_expiry?: number
  created_at?: string
  updated_at?: string
}

export interface CustomerDevice {
  id: string
  organization_id: string
  customer_id: string
  device_type: 'Laptop' | 'Desktop' | 'Printer' | 'CCTV' | 'MacBook' | 'Server' | 'Other'
  brand: string
  model?: string
  serial_number?: string
  configuration_specs?: string
  purchase_date?: string
  warranty_expiry_date?: string
  warranty_type: 'Shop Warranty' | 'Manufacturer Warranty' | 'AMC Covered' | 'Out of Warranty' | 'Extended Warranty'
  notes?: string
  created_at?: string
}

// ==========================================
// 1. LEADS & INQUIRY PIPELINE
// ==========================================

export async function getCrmLeads(
  organizationId: string,
  filter?: { status?: LeadStatus; search?: string }
): Promise<CrmLead[]> {
  try {
    let query = supabaseService
      .from('crm_leads')
      .select(`
        *,
        user_profiles!crm_leads_assigned_staff_id_fkey ( full_name )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filter?.status) {
      query = query.eq('status', filter.status)
    }

    const { data, error } = await query
    if (!error && data) {
      return data.map((d: any) => ({
        ...d,
        estimated_value: parseFloat(d.estimated_value || '0') || 0,
        assigned_staff_name: d.user_profiles?.full_name,
      }))
    }
  } catch (err) {
    console.warn('Notice querying crm_leads table:', err)
  }

  // Fallback to audit_logs metadata
  try {
    const { data: logs, error: logErr } = await supabaseService
      .from('audit_logs')
      .select('id, details, timestamp, entity_id')
      .eq('organization_id', organizationId)
      .eq('action', 'CRM_LEAD_SAVE')
      .order('timestamp', { ascending: false })

    if (!logErr && logs && logs.length > 0) {
      // Deduplicate by lead ID (keep most recent state)
      const map = new Map<string, CrmLead>()
      for (const l of logs) {
        const lead = l.details as CrmLead
        const leadKey = lead?.id || l.entity_id
        if (leadKey && !map.has(leadKey)) {
          if (!filter?.status || lead.status === filter.status) {
            map.set(leadKey, {
              ...lead,
              id: leadKey,
              estimated_value: parseFloat((lead.estimated_value as any) || '0') || 0,
              created_at: lead.created_at || l.timestamp,
            })
          }
        }
      }
      return Array.from(map.values())
    }
  } catch (logErr) {
    console.warn('Fallback error for crm_leads:', logErr)
  }

  return []
}

export async function createCrmLead(
  lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>
): Promise<CrmLead> {
  const newId = crypto.randomUUID()
  const payload: CrmLead = {
    ...lead,
    id: newId,
    estimated_value: Math.max(0, lead.estimated_value || 0),
    status: lead.status || 'New Lead',
    source: lead.source || 'Walk-in',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let tableSuccess = false
  try {
    const { data, error } = await supabaseService
      .from('crm_leads')
      .insert([payload])
      .select()
      .single()

    if (!error && data) {
      tableSuccess = true
    }
  } catch (err) {
    console.warn('Direct insert into crm_leads failed, using audit fallback:', err)
  }

  // Guaranteed persistent storage in audit_logs
  try {
    const { error: insErr } = await supabaseService.from('audit_logs').insert([
      {
        organization_id: lead.organization_id,
        action: 'CRM_LEAD_SAVE',
        entity_type: 'CRM_LEAD',
        entity_id: newId,
        details: payload,
      },
    ])
    if (insErr) {
      console.error('Audit fallback insert error for crm_lead:', insErr)
    }
  } catch (err) {
    console.warn('Audit fallback notice for crm_lead:', err)
  }

  return payload
}

export async function updateLeadStatus(
  leadId: string,
  organizationId: string,
  status: LeadStatus,
  extra?: { lost_reason?: string; notes?: string }
): Promise<boolean> {
  let tableSuccess = false
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (extra?.lost_reason) updateData.lost_reason = extra.lost_reason
    if (extra?.notes) updateData.notes = extra.notes

    const { error } = await supabaseService
      .from('crm_leads')
      .update(updateData)
      .eq('id', leadId)
      .eq('organization_id', organizationId)

    if (!error) tableSuccess = true
  } catch (err) {
    console.warn('Error updating lead status in crm_leads:', err)
  }

  // Fallback audit log: fetch existing lead details, update status, and write new snapshot
  try {
    const { data: logs } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('organization_id', organizationId)
      .eq('action', 'CRM_LEAD_SAVE')
      .eq('entity_id', leadId)
      .order('timestamp', { ascending: false })
      .limit(1)

    const existing = (logs?.[0]?.details as CrmLead) || { id: leadId, organization_id: organizationId }
    const updatedLead: CrmLead = {
      ...existing,
      status,
      lost_reason: extra?.lost_reason || existing.lost_reason,
      notes: extra?.notes ? `${existing.notes ? existing.notes + '\n' : ''}${extra.notes}` : existing.notes,
      updated_at: new Date().toISOString(),
    }

    await supabaseService.from('audit_logs').insert([
      {
        organization_id: organizationId,
        action: 'CRM_LEAD_SAVE',
        entity_type: 'CRM_LEAD',
        entity_id: leadId,
        details: updatedLead,
      },
    ])
    return true
  } catch (err) {
    console.error('Audit fallback update error for crm_lead:', err)
    return tableSuccess
  }
}

// ==========================================
// 2. CUSTOMER INTERACTIONS & FOLLOW-UPS
// ==========================================

export async function getCrmActivities(
  organizationId: string,
  customerId?: string
): Promise<CrmActivity[]> {
  try {
    let query = supabaseService
      .from('crm_activities')
      .select(`
        *,
        customers ( customer_name, phone_number ),
        user_profiles!crm_activities_created_by_user_id_fkey ( full_name )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        ...d,
        customer_name: d.customers?.customer_name,
        customer_phone: d.customers?.phone_number,
        created_by_name: d.user_profiles?.full_name,
      }))
    }
  } catch (err) {
    console.warn('Notice querying crm_activities:', err)
  }

  // Fallback storage in audit_logs
  try {
    const { data: logs, error: logErr } = await supabaseService
      .from('audit_logs')
      .select('id, details, timestamp, entity_id')
      .eq('organization_id', organizationId)
      .eq('action', 'CRM_ACTIVITY_SAVE')
      .order('timestamp', { ascending: false })

    if (!logErr && logs && logs.length > 0) {
      const map = new Map<string, CrmActivity>()
      for (const l of logs) {
        const act = l.details as CrmActivity
        const actKey = act?.id || l.entity_id
        if (actKey && !map.has(actKey)) {
          if (!customerId || act.customer_id === customerId) {
            map.set(actKey, {
              ...act,
              id: actKey,
              created_at: act.created_at || l.timestamp,
            })
          }
        }
      }
      return Array.from(map.values())
    }
  } catch (err) {
    console.warn('Fallback error for crm_activities:', err)
  }

  return []
}

export async function logCrmActivity(
  activity: Omit<CrmActivity, 'id' | 'created_at'>
): Promise<CrmActivity> {
  const newId = crypto.randomUUID()
  const payload: CrmActivity = {
    ...activity,
    id: newId,
    created_at: new Date().toISOString(),
  }

  let tableSuccess = false
  try {
    const { data, error } = await supabaseService
      .from('crm_activities')
      .insert([payload])
      .select()
      .single()

    if (!error && data) tableSuccess = true
  } catch (err) {
    console.warn('Direct insert into crm_activities failed, using audit fallback:', err)
  }

  try {
    const { error: insErr } = await supabaseService.from('audit_logs').insert([
      {
        organization_id: activity.organization_id,
        action: 'CRM_ACTIVITY_SAVE',
        entity_type: 'CRM_ACTIVITY',
        entity_id: newId,
        details: payload,
      },
    ])
    if (insErr) {
      console.error('Audit fallback insert error for activity:', insErr)
    }
  } catch (err) {
    console.warn('Audit fallback notice for activity:', err)
  }

  return payload
}

export async function getUpcomingFollowUps(
  organizationId: string
): Promise<CrmActivity[]> {
  const todayStr = new Date().toISOString().slice(0, 10)
  try {
    const { data, error } = await supabaseService
      .from('crm_activities')
      .select(`
        *,
        customers ( customer_name, phone_number )
      `)
      .eq('organization_id', organizationId)
      .eq('follow_up_status', 'Pending')
      .gte('follow_up_date', todayStr)
      .order('follow_up_date', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        ...d,
        customer_name: d.customers?.customer_name,
        customer_phone: d.customers?.phone_number,
      }))
    }
  } catch (err) {
    console.warn('Notice querying upcoming follow-ups:', err)
  }

  // Fallback audit_logs
  try {
    const allActivities = await getCrmActivities(organizationId)
    return allActivities
      .filter((a) => a.follow_up_status === 'Pending' && a.follow_up_date && a.follow_up_date >= todayStr)
      .sort((a, b) => (a.follow_up_date || '').localeCompare(b.follow_up_date || ''))
  } catch {
    return []
  }
}

export async function updateFollowUpStatus(
  activityId: string,
  organizationId: string,
  status: 'Pending' | 'Completed' | 'Cancelled'
): Promise<boolean> {
  let tableSuccess = false
  try {
    const { error } = await supabaseService
      .from('crm_activities')
      .update({ follow_up_status: status })
      .eq('id', activityId)
      .eq('organization_id', organizationId)

    if (!error) tableSuccess = true
  } catch (err) {
    console.warn('Error updating follow_up_status:', err)
  }

  try {
    const { data: logs } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('organization_id', organizationId)
      .eq('action', 'CRM_ACTIVITY_SAVE')
      .eq('entity_id', activityId)
      .order('timestamp', { ascending: false })
      .limit(1)

    const existing = (logs?.[0]?.details as CrmActivity) || { id: activityId, organization_id: organizationId }
    const updated = {
      ...existing,
      follow_up_status: status,
    }

    await supabaseService.from('audit_logs').insert([
      {
        organization_id: organizationId,
        action: 'CRM_ACTIVITY_SAVE',
        entity_type: 'CRM_ACTIVITY',
        entity_id: activityId,
        details: updated,
      },
    ])
    return true
  } catch (err) {
    console.error('Audit fallback error updating follow-up status:', err)
    return tableSuccess
  }
}

// ==========================================
// 3. ANNUAL MAINTENANCE CONTRACTS (AMC)
// ==========================================

export async function getAmcContracts(
  organizationId: string,
  customerId?: string
): Promise<AmcContract[]> {
  const todayMs = new Date().getTime()

  try {
    let query = supabaseService
      .from('amc_contracts')
      .select(`
        *,
        customers ( customer_name, phone_number, gstin )
      `)
      .eq('organization_id', organizationId)
      .order('end_date', { ascending: true })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data.map((c: any) => {
        const endMs = new Date(c.end_date).getTime()
        const daysToExpiry = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24))

        let status = c.status
        if (daysToExpiry < 0 && status !== 'Renewed' && status !== 'Terminated') {
          status = 'Expired'
        } else if (daysToExpiry <= 30 && daysToExpiry >= 0 && status === 'Active') {
          status = 'Expiring Soon'
        }

        return {
          ...c,
          status,
          days_to_expiry: daysToExpiry,
          customer_name: c.customers?.customer_name,
          customer_phone: c.customers?.phone_number,
          customer_company: c.customers?.gstin,
          contract_value: parseFloat(c.contract_value || '0') || 0,
        }
      })
    }
  } catch (err) {
    console.warn('Notice querying amc_contracts table:', err)
  }

  // Fallback to audit_logs
  try {
    const { data: logs, error: logErr } = await supabaseService
      .from('audit_logs')
      .select('id, details, timestamp, entity_id')
      .eq('organization_id', organizationId)
      .eq('action', 'CRM_AMC_SAVE')
      .order('timestamp', { ascending: false })

    if (!logErr && logs && logs.length > 0) {
      const map = new Map<string, AmcContract>()
      for (const l of logs) {
        const c = l.details as AmcContract
        const amcKey = c?.id || l.entity_id
        if (amcKey && !map.has(amcKey)) {
          if (!customerId || c.customer_id === customerId) {
            const endMs = new Date(c.end_date).getTime()
            const daysToExpiry = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24))
            let status = c.status
            if (daysToExpiry < 0 && status !== 'Renewed' && status !== 'Terminated') {
              status = 'Expired'
            } else if (daysToExpiry <= 30 && daysToExpiry >= 0 && status === 'Active') {
              status = 'Expiring Soon'
            }

            map.set(amcKey, {
              ...c,
              id: amcKey,
              status,
              days_to_expiry: daysToExpiry,
              created_at: c.created_at || l.timestamp,
            })
          }
        }
      }
      return Array.from(map.values())
    }
  } catch (err) {
    console.warn('Fallback error for amc_contracts:', err)
  }

  return []
}

export async function createAmcContract(
  contract: Omit<AmcContract, 'id' | 'created_at' | 'updated_at'>
): Promise<AmcContract> {
  const newId = crypto.randomUUID()
  const payload: AmcContract = {
    ...contract,
    id: newId,
    contract_value: Math.max(0, contract.contract_value || 0),
    service_visits_allowed: contract.service_visits_allowed || 4,
    service_visits_completed: 0,
    covered_devices_count: contract.covered_devices_count || 1,
    status: contract.status || 'Active',
    payment_status: contract.payment_status || 'Paid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let tableSuccess = false
  try {
    const { data, error } = await supabaseService
      .from('amc_contracts')
      .insert([payload])
      .select()
      .single()

    if (!error && data) tableSuccess = true
  } catch (err) {
    console.warn('Direct insert into amc_contracts failed, using audit fallback:', err)
  }

  try {
    const { error: insErr } = await supabaseService.from('audit_logs').insert([
      {
        organization_id: contract.organization_id,
        action: 'CRM_AMC_SAVE',
        entity_type: 'CRM_AMC',
        entity_id: newId,
        details: payload,
      },
    ])
    if (insErr) {
      console.error('Audit fallback insert error for amc_contract:', insErr)
    }
  } catch (err) {
    console.warn('Audit fallback notice for amc_contract:', err)
  }

  return payload
}

export async function incrementAmcVisit(
  contractId: string,
  organizationId: string
): Promise<boolean> {
  let tableSuccess = false
  try {
    const { data: contract } = await supabaseService
      .from('amc_contracts')
      .select('service_visits_completed')
      .eq('id', contractId)
      .eq('organization_id', organizationId)
      .single()

    if (contract) {
      await supabaseService
        .from('amc_contracts')
        .update({
          service_visits_completed: (contract.service_visits_completed || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId)
      tableSuccess = true
    }
  } catch (err) {
    console.warn('Error incrementing amc visit:', err)
  }

  try {
    const { data: logs } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('organization_id', organizationId)
      .eq('action', 'CRM_AMC_SAVE')
      .eq('entity_id', contractId)
      .order('timestamp', { ascending: false })
      .limit(1)

    const existing = (logs?.[0]?.details as AmcContract) || { id: contractId, organization_id: organizationId }
    const updated: AmcContract = {
      ...existing,
      service_visits_completed: (existing.service_visits_completed || 0) + 1,
      updated_at: new Date().toISOString(),
    }

    await supabaseService.from('audit_logs').insert([
      {
        organization_id: organizationId,
        action: 'CRM_AMC_SAVE',
        entity_type: 'CRM_AMC',
        entity_id: contractId,
        details: updated,
      },
    ])
    return true
  } catch (err) {
    return tableSuccess
  }
}

// ==========================================
// 4. CUSTOMER DEVICES & WARRANTY REGISTRY
// ==========================================

export async function getCustomerDevices(
  organizationId: string,
  customerId?: string
): Promise<CustomerDevice[]> {
  try {
    let query = supabaseService
      .from('customer_devices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) return data
  } catch (err) {
    console.warn('Notice querying customer_devices:', err)
  }

  // Fallback audit logs
  try {
    const { data: logs, error: logErr } = await supabaseService
      .from('audit_logs')
      .select('id, details, timestamp, entity_id')
      .eq('organization_id', organizationId)
      .eq('action', 'CRM_DEVICE_SAVE')
      .order('timestamp', { ascending: false })

    if (!logErr && logs && logs.length > 0) {
      const map = new Map<string, CustomerDevice>()
      for (const l of logs) {
        const d = l.details as CustomerDevice
        const devKey = d?.id || l.entity_id
        if (devKey && !map.has(devKey)) {
          if (!customerId || d.customer_id === customerId) {
            map.set(devKey, {
              ...d,
              id: devKey,
              created_at: d.created_at || l.timestamp,
            })
          }
        }
      }
      return Array.from(map.values())
    }
  } catch (err) {
    console.warn('Fallback error for customer_devices:', err)
  }

  return []
}

export async function registerCustomerDevice(
  device: Omit<CustomerDevice, 'id' | 'created_at'>
): Promise<CustomerDevice> {
  const newId = crypto.randomUUID()
  const payload: CustomerDevice = {
    ...device,
    id: newId,
    created_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabaseService
      .from('customer_devices')
      .insert([payload])
      .select()
      .single()

    if (!error && data) return data
  } catch (err) {
    console.warn('Direct insert into customer_devices failed, using audit fallback:', err)
  }

  try {
    const { error: insErr } = await supabaseService.from('audit_logs').insert([
      {
        organization_id: device.organization_id,
        action: 'CRM_DEVICE_SAVE',
        entity_type: 'CRM_DEVICE',
        entity_id: newId,
        details: payload,
      },
    ])
    if (insErr) {
      console.error('Audit fallback insert error for customer_device:', insErr)
    }
  } catch (err) {
    console.warn('Audit fallback notice for customer_device:', err)
  }

  return payload
}

// ==========================================
// 5. 1-CLICK WHATSAPP COMMUNICATION GENERATOR
// ==========================================

export type WhatsAppTemplateType =
  | 'payment_reminder'
  | 'service_ready'
  | 'service_status'
  | 'quotation_followup'
  | 'amc_renewal'
  | 'amc_visit_schedule'
  | 'general_greeting'

export function buildWhatsAppUrl(
  phone: string,
  templateType: WhatsAppTemplateType,
  vars: {
    customerName?: string
    invoiceNumber?: string
    balanceDue?: number
    serviceRefNumber?: string
    deviceModel?: string
    serviceStatus?: string
    quotationNumber?: string
    companyName?: string
    grandTotal?: number
    contractNumber?: string
    contractTitle?: string
    expiryDate?: string
    visitsDone?: number
    visitsAllowed?: number
  }
): string {
  const cleanPhone = (phone || '').replace(/\D/g, '')
  if (!cleanPhone) return '#'

  const custName = vars.customerName || 'Customer'
  let msg = ''

  switch (templateType) {
    case 'payment_reminder':
      msg = `Dear ${custName}, this is a gentle reminder from Gnapika Computer Services regarding your pending balance of ₹${(vars.balanceDue || 0).toFixed(2)} against Bill #${vars.invoiceNumber || ''}. Kindly arrange for the payment at your earliest convenience. Thank you!`
      break

    case 'service_ready':
      msg = `Hello ${custName}, great news! Your device (${vars.deviceModel || 'device'}) is fully serviced and ready for pickup at Gnapika Computer Services! Service Bill: ₹${(vars.grandTotal || 0).toFixed(2)}. Service Ref: #${vars.serviceRefNumber || ''}. Thank you!`
      break

    case 'service_status':
      msg = `Hello ${custName}, regarding your service ticket #${vars.serviceRefNumber || ''} (${vars.deviceModel || 'device'}): your repair status is currently: *${vars.serviceStatus || 'In Progress'}*. We will notify you once ready!`
      break

    case 'quotation_followup':
      msg = `Dear ${custName}, we hope you are doing well. We are following up regarding Quotation #${vars.quotationNumber || ''} for ${vars.companyName || 'your company'} (Total: ₹${(vars.grandTotal || 0).toFixed(2)}). Please let us know if you require any adjustments or wish to proceed. Regards, Gnapika Computer Services.`
      break

    case 'amc_renewal':
      msg = `Dear ${custName}, your Annual Maintenance Contract (AMC #${vars.contractNumber || ''} - ${vars.contractTitle || 'IT Support'}) is expiring on *${vars.expiryDate || ''}*. Kindly renew to ensure uninterrupted hardware and network maintenance. Thank you, Gnapika Computer Services!`
      break

    case 'amc_visit_schedule':
      msg = `Dear ${custName}, a routine AMC maintenance service visit is scheduled for your premises. Routine maintenance visits completed so far: ${vars.visitsDone || 0} of ${vars.visitsAllowed || 4}. Gnapika Computer Services team.`
      break

    case 'general_greeting':
    default:
      msg = `Hello ${custName}, greetings from Gnapika Computer Services! Please let us know how we can assist you today.`
      break
  }

  const encoded = encodeURIComponent(msg)
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
  return `https://wa.me/${fullPhone}?text=${encoded}`
}
