// app/api/reports/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import { getReportsDashboardData } from '@/lib/reports'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check: Owner or staff with 'reports' permission
    const canViewReports =
      context.isOwner || hasPermission(context.permissions, 'reports')

    if (!canViewReports) {
      return NextResponse.json(
        { error: 'Access Denied: You do not have permission to view business reports.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined
    const branchId = searchParams.get('branch_id') || undefined
    const type = searchParams.get('type') || 'full'

    const reportData = await getReportsDashboardData(context.organization_id, {
      startDate,
      endDate,
      branchId,
    })

    if (type === 'sales-summary') {
      return NextResponse.json({
        total_invoices: reportData.kpis.invoicesCount,
        total_sales: reportData.kpis.grossRevenue,
        total_collections: reportData.kpis.totalCollections,
        outstanding: reportData.kpis.totalReceivables,
        avg_invoice_value:
          reportData.kpis.invoicesCount > 0
            ? reportData.kpis.grossRevenue / reportData.kpis.invoicesCount
            : 0,
      })
    }

    if (type === 'gst') {
      return NextResponse.json(reportData.gstReport)
    }

    if (type === 'outstanding') {
      return NextResponse.json(reportData.outstandingDebtors)
    }

    if (type === 'services') {
      return NextResponse.json(reportData.serviceReport)
    }

    if (type === 'cash-flow') {
      return NextResponse.json(reportData.cashFlowMatrix)
    }

    // Default: full comprehensive report payload
    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error: any) {
    console.error('Error in reports API GET:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}