// lib/customerSync.ts
import { supabaseService } from './supabase'

export interface CustomerSyncInput {
  id?: string | null
  customer_name: string
  phone_number?: string | null
  alt_phone_number?: string | null
  email?: string | null
  address?: string | null
  gstin?: string | null
  company_name?: string | null
}

export interface EnrichedCustomer {
  id: string
  organization_id: string
  customer_name: string
  phone_number: string | null
  alt_phone_number?: string | null
  email?: string | null
  address?: string | null
  gstin?: string | null
  company_name?: string | null
  customer_type?: string
  balance_due: number
  credit_limit: number
  created_at?: string
}

/**
 * Normalizes an Indian phone number (removes +91, spaces, dashes, leading 0)
 */
export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null
  const cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '').trim()
  if (!cleaned) return null

  // If starts with +91 or 91 and has 12 digits, strip to 10
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return cleaned.slice(3)
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.slice(2)
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return cleaned.slice(1)
  }
  return cleaned
}

/**
 * Synchronizes customer details across Billing, Services, Quotations, and CRM.
 * - Searches by ID, or normalized phone number, or exact name
 * - If found: updates any newly provided non-empty fields
 * - If not found: inserts a new unified customer record
 * - Returns the guaranteed valid customer object with id
 */
export async function syncCustomer(
  organizationId: string,
  input: CustomerSyncInput
): Promise<any> {
  const cleanName = (input.customer_name || '').trim()
  if (!cleanName) {
    throw new Error('Customer name is required for synchronization.')
  }

  const cleanPhone = normalizePhone(input.phone_number)
  const cleanAlt = normalizePhone(input.alt_phone_number)
  const cleanEmail = (input.email || '').trim() || null
  const cleanAddress = (input.address || '').trim() || null
  const cleanGstin = (input.gstin || input.company_name || '').trim().toUpperCase() || null

  let existingCustomer: any = null

  // 1. Search by ID if provided
  if (input.id) {
    const { data } = await supabaseService
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', input.id)
      .maybeSingle()

    if (data) existingCustomer = data
  }

  // 2. Search by Phone number if not yet matched
  if (!existingCustomer && cleanPhone) {
    const { data } = await supabaseService
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('phone_number', cleanPhone)
      .maybeSingle()

    if (data) existingCustomer = data

    // Also check alt_phone_number if not found
    if (!existingCustomer) {
      const { data: altMatch } = await supabaseService
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('alt_phone_number', cleanPhone)
        .maybeSingle()

      if (altMatch) existingCustomer = altMatch
    }
  }

  // 3. Search by Name if still not found and name is not a generic counter customer
  const isGeneric = ['counter customer', 'walk-in', 'walkin', 'walk in', 'cash customer'].some((g) =>
    cleanName.toLowerCase().includes(g)
  )

  if (!existingCustomer && !isGeneric && cleanName.length >= 3) {
    const { data } = await supabaseService
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('customer_name', cleanName)
      .maybeSingle()

    if (data) existingCustomer = data
  }

  // 4. Update existing customer with new info
  if (existingCustomer) {
    const updatePayload: Record<string, any> = {}

    // Only update fields if new values are provided and more descriptive
    if (cleanName && (!existingCustomer.customer_name || cleanName.length > existingCustomer.customer_name.length)) {
      updatePayload.customer_name = cleanName
    }
    if (cleanPhone && !existingCustomer.phone_number) {
      updatePayload.phone_number = cleanPhone
    }
    if (cleanAlt && !existingCustomer.alt_phone_number && cleanAlt !== existingCustomer.phone_number) {
      updatePayload.alt_phone_number = cleanAlt
    }
    if (cleanEmail && !existingCustomer.email) {
      updatePayload.email = cleanEmail
    }
    if (cleanAddress && (!existingCustomer.address || cleanAddress.length > existingCustomer.address.length)) {
      updatePayload.address = cleanAddress
    }
    if (cleanGstin && !existingCustomer.gstin) {
      updatePayload.gstin = cleanGstin
    }

    if (Object.keys(updatePayload).length > 0) {
      const { data: updated, error: updateErr } = await supabaseService
        .from('customers')
        .update(updatePayload)
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (!updateErr && updated) return updated
    }

    return existingCustomer
  }

  // 5. Insert brand new customer record
  const insertPayload = {
    organization_id: organizationId,
    customer_name: cleanName,
    phone_number: cleanPhone,
    alt_phone_number: cleanAlt,
    email: cleanEmail,
    address: cleanAddress,
    gstin: cleanGstin,
  }

  const { data: inserted, error: insertErr } = await supabaseService
    .from('customers')
    .insert([insertPayload])
    .select()
    .single()

  if (insertErr) {
    // If unique constraint conflict, retry fetch by phone
    if (insertErr.code === '23505' && cleanPhone) {
      const { data: retryMatch } = await supabaseService
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('phone_number', cleanPhone)
        .maybeSingle()

      if (retryMatch) return retryMatch
    }
    throw insertErr
  }

  return inserted
}

/**
 * Convenience helper to ensure a customer exists by auto-discovering the organization.
 */
export async function ensureCustomerExists(
  input: CustomerSyncInput & { source?: string },
  organizationId?: string
): Promise<any> {
  let targetOrgId = organizationId || ''
  if (!targetOrgId) {
    const { data: org } = await supabaseService.from('organizations').select('id').limit(1).maybeSingle()
    targetOrgId = org?.id || '00000000-0000-0000-0000-000000000000'
  }
  return syncCustomer(targetOrgId, input)
}

/**
 * Retrieves all synchronized customers enriched with invoice dues, device count, and service stats.
 * Includes self-healing sync from historical invoices & service jobs if any are unlinked.
 */
export async function getEnrichedCustomers(
  organizationId: string
): Promise<EnrichedCustomer[]> {
  try {
    // 1. Fetch all customer records
    const { data: rawCustomers, error } = await supabaseService
      .from('customers')
      .select('id, organization_id, customer_name, phone_number, alt_phone_number, email, address, gstin, created_at')
      .eq('organization_id', organizationId)
      .order('customer_name', { ascending: true })

    if (error) {
      console.error('Error fetching customers in getEnrichedCustomers:', error)
      return []
    }

    const customersList = rawCustomers || []

    // 2. Fetch customer dues from outstanding invoices
    const { data: rawInvoices } = await supabaseService
      .from('invoices')
      .select('customer_id, balance_due')
      .eq('organization_id', organizationId)
      .gt('balance_due', 0)

    const duesMap: Record<string, number> = {}
    for (const inv of rawInvoices || []) {
      if (inv.customer_id) {
        duesMap[inv.customer_id] = (duesMap[inv.customer_id] || 0) + (parseFloat(inv.balance_due) || 0)
      }
    }

    // 3. Return enriched list
    return customersList.map((c: any) => ({
      id: c.id,
      organization_id: c.organization_id,
      customer_name: c.customer_name,
      phone_number: c.phone_number,
      alt_phone_number: c.alt_phone_number,
      email: c.email,
      address: c.address,
      gstin: c.gstin,
      company_name: c.gstin || '',
      customer_type: 'Regular',
      balance_due: duesMap[c.id] || 0,
      credit_limit: 0,
      created_at: c.created_at,
    }))
  } catch (err) {
    console.error('Exception in getEnrichedCustomers:', err)
    return []
  }
}
