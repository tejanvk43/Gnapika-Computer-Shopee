// lib/audit.ts
import { supabaseService } from './supabase'

export async function logAuditEvent(
  organizationId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: any
) {
  await supabaseService
    .from('audit_logs')
    .insert([{
      organization_id: organizationId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      timestamp: new Date().toISOString()
    }])
}