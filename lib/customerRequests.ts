// lib/customerRequests.ts
import { supabaseService } from './supabase'
import crypto from 'crypto'

export type ServiceType = 'home' | 'store'
export type ServiceRequestStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed'

export interface CustomerServiceRequest {
  id: string
  organization_id: string
  request_number: string
  service_type: ServiceType
  customer_name: string
  phone_number: string
  alt_phone_number?: string
  email?: string
  address?: string
  device_type?: string
  brand?: string
  model?: string
  preferred_date: string
  preferred_time_slot: string
  problem_description: string
  voice_note_url?: string
  image_urls?: string[]
  status: ServiceRequestStatus
  rejection_reason?: string
  assigned_technician_id?: string
  assigned_technician_name?: string
  converted_service_job_id?: string
  created_at: string
  updated_at: string
}

export type QuotationRequestStatus = 'pending' | 'reviewed' | 'quoted' | 'rejected'

export interface CustomerQuotationRequest {
  id: string
  organization_id: string
  request_number: string
  customer_name: string
  phone_number: string
  email?: string
  company_name?: string
  category: string
  requirements_description: string
  budget_range?: string
  urgency?: string
  reference_image_urls?: string[]
  status: QuotationRequestStatus
  owner_reply?: string
  quoted_amount?: number
  converted_quotation_id?: string
  created_at: string
  updated_at: string
}

export interface ServiceRequestMessage {
  id: string
  request_id: string
  sender_type: 'customer' | 'team'
  sender_name: string
  message_text?: string
  image_url?: string
  audio_url?: string
  is_read?: boolean
  created_at: string
}

import fs from 'fs'
import path from 'path'

const DEFAULT_ORG_ID = '281358a2-aac3-4837-b8b3-a8616dbb545d'
const STORE_PATH = path.join(process.cwd(), 'data', 'customer_requests_store.json')

interface LocalStoreData {
  service_requests: CustomerServiceRequest[]
  quotation_requests: CustomerQuotationRequest[]
  chat_messages: ServiceRequestMessage[]
}

function getLocalStore(): LocalStoreData {
  try {
    if (!fs.existsSync(path.dirname(STORE_PATH))) {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
    }
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'))
    }
  } catch (e) {}
  return { service_requests: [], quotation_requests: [], chat_messages: [] }
}

function saveLocalStore(data: LocalStoreData) {
  try {
    if (!fs.existsSync(path.dirname(STORE_PATH))) {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {}
}

// Helper to generate unique human-readable request numbers
function generateRequestNumber(prefix: string): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${year}${rand}`
}

// -------------------------------------------------------------
// 1. SERVICE REQUESTS (HOME & STORE)
// -------------------------------------------------------------

export async function createServiceRequest(
  input: Partial<CustomerServiceRequest>
): Promise<CustomerServiceRequest> {
  const id = crypto.randomUUID()
  const orgId = input.organization_id || DEFAULT_ORG_ID
  const prefix = input.service_type === 'home' ? 'HSR' : 'SSR'
  const requestNumber = generateRequestNumber(prefix)
  const now = new Date().toISOString()

  const record: CustomerServiceRequest = {
    id,
    organization_id: orgId,
    request_number: requestNumber,
    service_type: input.service_type || 'home',
    customer_name: input.customer_name || 'Customer',
    phone_number: input.phone_number || '',
    alt_phone_number: input.alt_phone_number || '',
    email: input.email || '',
    address: input.address || '',
    device_type: input.device_type || 'Laptop',
    brand: input.brand || '',
    model: input.model || '',
    preferred_date: input.preferred_date || now.slice(0, 10),
    preferred_time_slot: input.preferred_time_slot || '10:00 AM - 01:00 PM',
    problem_description: input.problem_description || '',
    voice_note_url: input.voice_note_url || '',
    image_urls: input.image_urls || [],
    status: 'pending',
    created_at: now,
    updated_at: now,
  }

  // 0. Save to local resilient store
  try {
    const store = getLocalStore()
    store.service_requests = [record, ...store.service_requests.filter((r) => r.id !== record.id)]
    saveLocalStore(store)
  } catch (e) {}

  // 1. Try insert into dedicated table
  try {
    const { error } = await supabaseService.from('customer_service_requests').insert([record])
    if (!error) return record
  } catch (err) {
    console.warn('Direct customer_service_requests insert error, falling back to audit_logs:', err)
  }

  // 2. Fallback to audit_logs
  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: orgId,
        action: 'CUSTOMER_SERVICE_REQUEST_CREATE',
        entity_type: 'CUSTOMER_SERVICE_REQUEST',
        entity_id: id,
        details: record,
        timestamp: now,
      },
    ])
  } catch (auditErr) {
    console.error('Failed writing to audit_logs:', auditErr)
  }

  return record
}

export async function getServiceRequests(
  organizationId?: string,
  filter?: { status?: string; service_type?: string; phone_number?: string }
): Promise<CustomerServiceRequest[]> {
  const orgId = organizationId || DEFAULT_ORG_ID
  const results: CustomerServiceRequest[] = []
  const seenIds = new Set<string>()

  // 1. Try fetch from dedicated table
  try {
    let q = supabaseService
      .from('customer_service_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter?.status && filter.status !== 'ALL') {
      q = q.eq('status', filter.status)
    }
    if (filter?.service_type && filter.service_type !== 'ALL') {
      q = q.eq('service_type', filter.service_type)
    }
    if (filter?.phone_number) {
      q = q.ilike('phone_number', `%${filter.phone_number}%`)
    }

    const { data, error } = await q
    if (!error && data) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id)
          results.push(row)
        }
      }
    }
  } catch (err) {
    // ignore
  }

  // 2. Fetch from audit_logs
  try {
    const { data: logs, error: logErr } = await supabaseService
      .from('audit_logs')
      .select('details, timestamp')
      .eq('entity_type', 'CUSTOMER_SERVICE_REQUEST')
      .order('timestamp', { ascending: false })

    if (!logErr && logs) {
      for (const log of logs) {
        const item = log.details as CustomerServiceRequest
        if (item && item.id && !seenIds.has(item.id)) {
          if (filter?.status && filter.status !== 'ALL' && item.status !== filter.status) continue
          if (filter?.service_type && filter.service_type !== 'ALL' && item.service_type !== filter.service_type) continue
          if (filter?.phone_number && !item.phone_number?.includes(filter.phone_number)) continue

          seenIds.add(item.id)
          results.push(item)
        }
      }
    }
  } catch (auditErr) {
    // ignore
  }

  // 3. Merge from resilient local store
  try {
    const store = getLocalStore()
    for (const item of store.service_requests || []) {
      if (item && item.id && !seenIds.has(item.id)) {
        if (filter?.status && filter.status !== 'ALL' && item.status !== filter.status) continue
        if (filter?.service_type && filter.service_type !== 'ALL' && item.service_type !== filter.service_type) continue
        if (filter?.phone_number && !item.phone_number?.includes(filter.phone_number)) continue

        seenIds.add(item.id)
        results.push(item)
      }
    }
  } catch (e) {}

  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getServiceRequestById(requestId: string): Promise<CustomerServiceRequest | null> {
  // 1. Try table
  try {
    const { data, error } = await supabaseService
      .from('customer_service_requests')
      .select('*')
      .eq('id', requestId)
      .single()
    if (!error && data) return data
  } catch (err) {}

  // 2. Try audit_logs
  try {
    const { data: logs } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('entity_type', 'CUSTOMER_SERVICE_REQUEST')
      .eq('entity_id', requestId)
      .order('timestamp', { ascending: false })
      .limit(1)

    if (logs && logs[0]?.details) {
      return logs[0].details as CustomerServiceRequest
    }
  } catch (err) {}

  // 3. Try local store
  try {
    const store = getLocalStore()
    const found = store.service_requests.find((r) => r.id === requestId)
    if (found) return found
  } catch (e) {}

  return null
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequestStatus,
  details?: {
    rejection_reason?: string
    assigned_technician_name?: string
    converted_service_job_id?: string
  }
): Promise<CustomerServiceRequest | null> {
  const current = await getServiceRequestById(requestId)
  if (!current) return null

  const updated: CustomerServiceRequest = {
    ...current,
    status,
    rejection_reason: details?.rejection_reason || current.rejection_reason,
    assigned_technician_name: details?.assigned_technician_name || current.assigned_technician_name,
    converted_service_job_id: details?.converted_service_job_id || current.converted_service_job_id,
    updated_at: new Date().toISOString(),
  }

  // 0. Update local store
  try {
    const store = getLocalStore()
    store.service_requests = store.service_requests.map((r) => (r.id === requestId ? updated : r))
    if (!store.service_requests.some((r) => r.id === requestId)) {
      store.service_requests.unshift(updated)
    }
    saveLocalStore(store)
  } catch (e) {}

  // 1. Update table
  try {
    await supabaseService
      .from('customer_service_requests')
      .update(updated)
      .eq('id', requestId)
  } catch (err) {}

  // 2. Always write update to audit_logs
  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: updated.organization_id,
        action: 'CUSTOMER_SERVICE_REQUEST_UPDATE',
        entity_type: 'CUSTOMER_SERVICE_REQUEST',
        entity_id: requestId,
        details: updated,
        timestamp: new Date().toISOString(),
      },
    ])
  } catch (err) {}

  return updated
}

// -------------------------------------------------------------
// 2. QUOTATION REQUESTS (DIRECT TO OWNER)
// -------------------------------------------------------------

export async function createQuotationRequest(
  input: Partial<CustomerQuotationRequest>
): Promise<CustomerQuotationRequest> {
  const id = crypto.randomUUID()
  const orgId = input.organization_id || DEFAULT_ORG_ID
  const requestNumber = generateRequestNumber('QRQ')
  const now = new Date().toISOString()

  const record: CustomerQuotationRequest = {
    id,
    organization_id: orgId,
    request_number: requestNumber,
    customer_name: input.customer_name || 'Customer',
    phone_number: input.phone_number || '',
    email: input.email || '',
    company_name: input.company_name || '',
    category: input.category || 'General Hardware',
    requirements_description: input.requirements_description || '',
    budget_range: input.budget_range || '',
    urgency: input.urgency || 'Normal',
    reference_image_urls: input.reference_image_urls || [],
    status: 'pending',
    created_at: now,
    updated_at: now,
  }

  // 0. Save to local resilient store
  try {
    const store = getLocalStore()
    store.quotation_requests = [record, ...store.quotation_requests.filter((r) => r.id !== record.id)]
    saveLocalStore(store)
  } catch (e) {}

  try {
    const { error } = await supabaseService.from('customer_quotation_requests').insert([record])
    if (!error) return record
  } catch (err) {}

  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: orgId,
        action: 'CUSTOMER_QUOTATION_REQUEST_CREATE',
        entity_type: 'CUSTOMER_QUOTATION_REQUEST',
        entity_id: id,
        details: record,
        timestamp: now,
      },
    ])
  } catch (err) {}

  return record
}

export async function getQuotationRequests(
  organizationId?: string,
  filter?: { status?: string; phone_number?: string }
): Promise<CustomerQuotationRequest[]> {
  const orgId = organizationId || DEFAULT_ORG_ID
  const results: CustomerQuotationRequest[] = []
  const seenIds = new Set<string>()

  try {
    let q = supabaseService
      .from('customer_quotation_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter?.status && filter.status !== 'ALL') {
      q = q.eq('status', filter.status)
    }
    if (filter?.phone_number) {
      q = q.ilike('phone_number', `%${filter.phone_number}%`)
    }

    const { data, error } = await q
    if (!error && data) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id)
          results.push(row)
        }
      }
    }
  } catch (err) {}

  try {
    const { data: logs, error: logErr } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('entity_type', 'CUSTOMER_QUOTATION_REQUEST')
      .order('timestamp', { ascending: false })

    if (!logErr && logs) {
      for (const log of logs) {
        const item = log.details as CustomerQuotationRequest
        if (item && item.id && !seenIds.has(item.id)) {
          if (filter?.status && filter.status !== 'ALL' && item.status !== filter.status) continue
          if (filter?.phone_number && !item.phone_number?.includes(filter.phone_number)) continue
          seenIds.add(item.id)
          results.push(item)
        }
      }
    }
  } catch (err) {}

  // Merge from resilient local store
  try {
    const store = getLocalStore()
    for (const item of store.quotation_requests || []) {
      if (item && item.id && !seenIds.has(item.id)) {
        if (filter?.status && filter.status !== 'ALL' && item.status !== filter.status) continue
        if (filter?.phone_number && !item.phone_number?.includes(filter.phone_number)) continue
        seenIds.add(item.id)
        results.push(item)
      }
    }
  } catch (e) {}

  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function replyToQuotationRequest(
  requestId: string,
  reply: { owner_reply: string; quoted_amount?: number }
): Promise<CustomerQuotationRequest | null> {
  const requests = await getQuotationRequests()
  const target = requests.find((r) => r.id === requestId)
  if (!target) return null

  const updated: CustomerQuotationRequest = {
    ...target,
    status: 'quoted',
    owner_reply: reply.owner_reply,
    quoted_amount: reply.quoted_amount,
    updated_at: new Date().toISOString(),
  }

  // Update local store
  try {
    const store = getLocalStore()
    store.quotation_requests = store.quotation_requests.map((r) => (r.id === requestId ? updated : r))
    if (!store.quotation_requests.some((r) => r.id === requestId)) {
      store.quotation_requests.unshift(updated)
    }
    saveLocalStore(store)
  } catch (e) {}

  try {
    await supabaseService.from('customer_quotation_requests').update(updated).eq('id', requestId)
  } catch (err) {}

  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: updated.organization_id,
        action: 'CUSTOMER_QUOTATION_REQUEST_REPLY',
        entity_type: 'CUSTOMER_QUOTATION_REQUEST',
        entity_id: requestId,
        details: updated,
        timestamp: new Date().toISOString(),
      },
    ])
  } catch (err) {}

  return updated
}

// -------------------------------------------------------------
// 3. LIVE CHAT MESSAGING
// -------------------------------------------------------------

export async function sendChatMessage(
  input: Omit<ServiceRequestMessage, 'id' | 'created_at'>
): Promise<ServiceRequestMessage> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const record: ServiceRequestMessage = {
    id,
    request_id: input.request_id,
    sender_type: input.sender_type,
    sender_name: input.sender_name,
    message_text: input.message_text || '',
    image_url: input.image_url || '',
    audio_url: input.audio_url || '',
    is_read: false,
    created_at: now,
  }

  // 0. Save to resilient local store
  try {
    const store = getLocalStore()
    store.chat_messages = [...(store.chat_messages || []), record]
    saveLocalStore(store)
  } catch (e) {}

  try {
    const { error } = await supabaseService.from('service_request_messages').insert([record])
    if (!error) return record
  } catch (err) {}

  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: DEFAULT_ORG_ID,
        action: 'SERVICE_REQUEST_CHAT_MESSAGE',
        entity_type: 'SERVICE_REQUEST_CHAT',
        entity_id: input.request_id,
        details: record,
        timestamp: now,
      },
    ])
  } catch (err) {}

  return record
}

export async function getChatMessages(requestId: string): Promise<ServiceRequestMessage[]> {
  const results: ServiceRequestMessage[] = []
  const seenIds = new Set<string>()

  try {
    const { data, error } = await supabaseService
      .from('service_request_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id)
          results.push(row)
        }
      }
    }
  } catch (err) {}

  try {
    const { data: logs } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('entity_type', 'SERVICE_REQUEST_CHAT')
      .eq('entity_id', requestId)
      .order('timestamp', { ascending: true })

    if (logs) {
      for (const log of logs) {
        const item = log.details as ServiceRequestMessage
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id)
          results.push(item)
        }
      }
    }
  } catch (err) {}

  // Merge from resilient local store
  try {
    const store = getLocalStore()
    for (const item of store.chat_messages || []) {
      if (item && item.request_id === requestId && !seenIds.has(item.id)) {
        seenIds.add(item.id)
        results.push(item)
      }
    }
  } catch (e) {}

  return results.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}
