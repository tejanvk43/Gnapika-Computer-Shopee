// app/api/reports/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const branchId = searchParams.get('branch_id')

    let query = supabaseService.from('invoices').select('*').eq('organization_id', context.organization_id)

    if (startDate) query = query.gte('invoice_date', startDate)
    if (endDate) query = query.lte('invoice_date', endDate)
    if (branchId) query = query.eq('branch_id', branchId)

    const { data: invoices, error } = await query
    if (error) throw error

    switch (reportType) {
      case 'sales-summary': {
        const totalSales = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_grand_amount), 0)
        const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid), 0)
        const outstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0)
        return NextResponse.json({
          total_invoices: invoices.length,
          total_sales: totalSales,
          total_collections: totalPaid,
          outstanding: outstanding,
          avg_invoice_value: invoices.length > 0 ? totalSales / invoices.length : 0
        })
      }

      case 'payment-methods': {
        const methods = invoices.reduce((acc, inv) => {
          acc[inv.payment_method] = (acc[inv.payment_method] || 0) + parseFloat(inv.total_grand_amount)
          return acc
        }, {})
        return NextResponse.json(methods)
      }

      case 'daily-sales': {
        const daily = invoices.reduce((acc, inv) => {
          const date = inv.invoice_date.split('T')[0]
          acc[date] = (acc[date] || 0) + parseFloat(inv.total_grand_amount)
          return acc
        }, {})
        return NextResponse.json(Object.entries(daily).map(([date, total]) => ({ date, total })))
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}