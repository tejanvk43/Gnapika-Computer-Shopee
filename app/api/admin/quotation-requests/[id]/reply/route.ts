// app/api/admin/quotation-requests/[id]/reply/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { replyToQuotationRequest } from '@/lib/customerRequests'

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

    if (!context.isOwner) {
      return NextResponse.json({ error: 'Only the Owner can reply to quotation requests' }, { status: 403 })
    }

    const body = await request.json()
    const { owner_reply, quoted_amount } = body

    if (!owner_reply) {
      return NextResponse.json({ error: 'Reply text is required' }, { status: 400 })
    }

    const updated = await replyToQuotationRequest(params.id, {
      owner_reply,
      quoted_amount: quoted_amount ? parseFloat(quoted_amount) : undefined,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Quotation request not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, request: updated })
  } catch (error: any) {
    console.error('Owner reply quotation request error:', error)
    return NextResponse.json({ error: error?.message || 'Reply failed' }, { status: 500 })
  }
}
