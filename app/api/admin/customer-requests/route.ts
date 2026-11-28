// app/api/admin/customer-requests/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { getServiceRequests, getQuotationRequests } from '@/lib/customerRequests'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const status = searchParams.get('status') || 'ALL'

    const [serviceRequests, quotationRequests] = await Promise.all([
      getServiceRequests(context.organization_id, {
        status: status !== 'ALL' ? status : undefined,
        service_type: type === 'home' ? 'home' : type === 'store' ? 'store' : undefined,
      }),
      getQuotationRequests(context.organization_id, {
        status: status !== 'ALL' ? status : undefined,
      }),
    ])

    return NextResponse.json({
      serviceRequests,
      quotationRequests,
      pendingCount:
        serviceRequests.filter((r) => r.status === 'pending').length +
        quotationRequests.filter((q) => q.status === 'pending').length,
    })
  } catch (error: any) {
    console.error('Admin customer requests fetch error:', error)
    return NextResponse.json({ error: error?.message || 'Failed fetching requests' }, { status: 500 })
  }
}
