// app/api/admin/customer-requests/[id]/status/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { updateServiceRequestStatus, sendChatMessage } from '@/lib/customerRequests'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, rejection_reason, assigned_technician_name } = body

    if (!status || !['accepted', 'rejected', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    const updated = await updateServiceRequestStatus(params.id, status, {
      rejection_reason,
      assigned_technician_name,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // If accepted, post an initial system chat message opening the conversation!
    if (status === 'accepted') {
      try {
        await sendChatMessage({
          request_id: params.id,
          sender_type: 'team',
          sender_name: 'Gnapika Support Team',
          message_text: `Hello ${updated.customer_name}! Your ${
            updated.service_type === 'home' ? 'Home Service' : 'Store Visit'
          } booking has been ACCEPTED. ${
            assigned_technician_name ? `Technician assigned: ${assigned_technician_name}. ` : ''
          }You can now chat with our service team directly here and share any additional photos or information.`,
        })
      } catch (chatErr) {}
    } else if (status === 'rejected') {
      try {
        await sendChatMessage({
          request_id: params.id,
          sender_type: 'team',
          sender_name: 'Gnapika Support Team',
          message_text: `Your service booking request could not be accepted at this time. Reason: ${
            rejection_reason || 'Slot unavailable'
          }. Please contact us at 9493471414 if you have any questions.`,
        })
      } catch (chatErr) {}
    }

    return NextResponse.json({ success: true, request: updated })
  } catch (error: any) {
    console.error('Update request status error:', error)
    return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 })
  }
}
