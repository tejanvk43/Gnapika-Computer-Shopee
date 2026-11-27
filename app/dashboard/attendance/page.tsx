// app/dashboard/attendance/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStaffList, getDailyAttendance } from '@/lib/attendance'
import { AttendanceManagementDashboard } from '@/components/attendance/AttendanceManagementDashboard'

export default async function AttendancePage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // Restriction requested by User: Owner only
  if (!context.isOwner) {
    redirect('/dashboard')
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const staffList = await getStaffList(context.organization_id)
  const initialRecords = await getDailyAttendance(context.organization_id, todayStr)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <AttendanceManagementDashboard
        staffList={staffList}
        initialDate={todayStr}
        initialRecords={initialRecords}
      />
    </div>
  )
}
