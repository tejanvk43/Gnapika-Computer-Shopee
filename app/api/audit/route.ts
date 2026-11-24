// app/api/audit/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'

export async function GET() {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Only owners/admins can view audit logs
    const { data: membership } = await supabaseService
      .from('organization_memberships')
      .select('role')
      .eq('user_profile_id', context.user.id)
      .eq('organization_id', context.organization_id)
      .single()

    if (!membership || !['Owner', 'Admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: logs, error } = await supabaseService
      .from('audit_logs')
      .select('*')
      .eq('organization_id', context.organization_id)
      .order('timestamp', { ascending: false })
      .limit(100)

    if (error) throw error
    return NextResponse.json(logs || [])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { action, entityType, entityId, details } = await request.json()

    await logAuditEvent(
      context.organization_id,
      context.user.id,
      action,
      entityType,
      entityId,
      details
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}