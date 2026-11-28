// app/api/crm/activities/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import {
  getCrmActivities,
  logCrmActivity,
  getUpcomingFollowUps,
  updateFollowUpStatus,
  ActivityType,
} from '@/lib/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id') || undefined
    const type = searchParams.get('type')

    if (type === 'followups') {
      const followUps = await getUpcomingFollowUps(context.organization_id)
      return NextResponse.json({ followUps })
    }

    const activities = await getCrmActivities(context.organization_id, customerId)
    return NextResponse.json({ activities })
  } catch (err: any) {
    console.error('Error in CRM activities GET:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Update follow up status
    if (body.action === 'update_followup' && body.id && body.status) {
      const ok = await updateFollowUpStatus(body.id, context.organization_id, body.status)
      return NextResponse.json({ success: ok })
    }

    const {
      customer_id,
      lead_id,
      activity_type = 'Note',
      summary,
      details,
      follow_up_date,
      follow_up_time,
      follow_up_status = 'Pending',
    } = body

    if (!summary) {
      return NextResponse.json({ error: 'Activity summary is required.' }, { status: 400 })
    }

    const activity = await logCrmActivity({
      organization_id: context.organization_id,
      customer_id,
      lead_id,
      activity_type: activity_type as ActivityType,
      summary,
      details,
      follow_up_date,
      follow_up_time,
      follow_up_status,
      created_by_user_id: context.user?.id,
    })

    return NextResponse.json({ success: true, activity })
  } catch (err: any) {
    console.error('Error in CRM activities POST:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
