// lib/sequence.ts
import { supabaseService } from '@/lib/supabase'
import { getFinancialYear } from '@/lib/formatters'

/**
 * Generates the next sequential invoice number in the format:
 * GCS<Financial Year>/<Sequential Number>
 * Example: GCS26-27/1, GCS26-27/2, GCS26-27/3 ...
 * Automatically increments every April after March ends.
 */
export async function generateNextInvoiceNumber(organizationId: string): Promise<string> {
  const fy = getFinancialYear()
  const prefix = `GCS${fy}/`

  try {
    const { data: rows, error } = await supabaseService
      .from('invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .ilike('invoice_number', `GCS${fy}/%`)

    if (error) {
      console.warn('Notice: Error querying existing invoices for sequence:', error)
    }

    let maxSeq = 0
    if (rows && rows.length > 0) {
      for (const r of rows) {
        const invNum = String(r.invoice_number || '').trim()
        const parts = invNum.split('/')
        if (parts.length >= 2) {
          const num = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num
          }
        }
      }
    }

    const nextSeq = maxSeq + 1
    return `${prefix}${nextSeq}`
  } catch (err) {
    console.warn('Sequence generation fallback for invoice:', err)
    return `${prefix}1`
  }
}

/**
 * Generates the next sequential service reference number in the format:
 * GCS-SER<Financial Year>/<Sequential Number>
 * Example: GCS-SER26-27/1, GCS-SER26-27/2, GCS-SER26-27/3 ...
 * Automatically increments every April after March ends.
 */
export async function generateNextServiceRefNumber(organizationId: string): Promise<string> {
  const fy = getFinancialYear()
  const prefix = `GCS-SER${fy}/`

  try {
    const { data: rows, error } = await supabaseService
      .from('service_jobs')
      .select('service_ref_number')
      .eq('organization_id', organizationId)
      .or(`service_ref_number.ilike.GCS-SER${fy}/%,service_ref_number.ilike.GCS-SER-${fy}/%`)

    if (error) {
      console.warn('Notice: Error querying existing service jobs for sequence:', error)
    }

    let maxSeq = 0
    if (rows && rows.length > 0) {
      for (const r of rows) {
        const srvNum = String(r.service_ref_number || '').trim()
        const parts = srvNum.split('/')
        if (parts.length >= 2) {
          const num = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num
          }
        }
      }
    }

    const nextSeq = maxSeq + 1
    return `${prefix}${nextSeq}`
  } catch (err) {
    console.warn('Sequence generation fallback for service:', err)
    return `${prefix}1`
  }
}
