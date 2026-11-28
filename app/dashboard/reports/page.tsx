// app/dashboard/reports/page.tsx
import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getReportsDashboardData } from '@/lib/reports'
import { ReportsDashboard } from '@/components/reports/ReportsDashboard'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const canViewReports =
    context.isOwner || hasPermission(context.permissions, 'reports')

  if (!canViewReports) {
    redirect('/dashboard')
  }

  // Fetch initial report data for current month
  const reportData = await getReportsDashboardData(context.organization_id)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <ReportsDashboard initialData={reportData} />
    </div>
  )
}
