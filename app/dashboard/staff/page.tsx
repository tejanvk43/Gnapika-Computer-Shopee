// app/dashboard/staff/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { StaffManagementDashboard } from '@/components/staff/StaffManagementDashboard'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStaffData(organizationId: string, currentUserId: string) {
  // 1. Fetch user profiles
  const { data: profiles } = await supabaseService
    .from('user_profiles')
    .select('id, email, full_name, created_at, organization_id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  // 2. Fetch memberships for roles
  const { data: memberships } = await supabaseService
    .from('organization_memberships')
    .select('user_profile_id, role')
    .eq('organization_id', organizationId)

  const membershipMap = new Map((memberships || []).map((m) => [m.user_profile_id, m.role]))

  // 3. Fetch Auth Users for metadata
  const { data: authData } = await supabaseService.auth.admin.listUsers({ perPage: 100 })
  const authMap = new Map((authData?.users || []).map((u) => [u.id, u]))

  // 4. Fetch invoice stats
  const { data: invoices } = await supabaseService
    .from('invoices')
    .select('created_by_user_id, total_grand_amount')
    .eq('organization_id', organizationId)

  const invoiceStatsMap = new Map<string, { count: number; totalSales: number }>()
  for (const inv of invoices || []) {
    const uId = inv.created_by_user_id || 'unknown'
    const cur = invoiceStatsMap.get(uId) || { count: 0, totalSales: 0 }
    cur.count += 1
    cur.totalSales += parseFloat(inv.total_grand_amount) || 0
    invoiceStatsMap.set(uId, cur)
  }

  // 5. Fetch service job stats
  const { data: serviceJobs } = await supabaseService
    .from('service_jobs')
    .select('assigned_technician_id, status')
    .eq('organization_id', organizationId)

  const serviceStatsMap = new Map<string, { count: number; completedCount: number }>()
  for (const srv of serviceJobs || []) {
    const uId = srv.assigned_technician_id || 'unknown'
    const cur = serviceStatsMap.get(uId) || { count: 0, completedCount: 0 }
    cur.count += 1
    if (srv.status === 'Completed' || srv.status === 'Delivered') {
      cur.completedCount += 1
    }
    serviceStatsMap.set(uId, cur)
  }

  return (profiles || []).map((p) => {
    const authUser = authMap.get(p.id)
    const role = membershipMap.get(p.id) || authUser?.user_metadata?.role || (p.id === currentUserId ? 'Owner' : 'Staff')
    const isOwner = role === 'Owner'
    const permissions: string[] = isOwner
      ? ['*']
      : Array.isArray(authUser?.user_metadata?.permissions)
      ? authUser.user_metadata.permissions
      : ['billing', 'services']

    const invStat = invoiceStatsMap.get(p.id) || { count: 0, totalSales: 0 }
    const srvStat = serviceStatsMap.get(p.id) || { count: 0, completedCount: 0 }

    return {
      id: p.id,
      email: p.email,
      full_name: authUser?.user_metadata?.full_name || p.full_name || 'Staff Member',
      role,
      is_owner: isOwner,
      permissions,
      created_at: p.created_at,
      is_current_user: p.id === currentUserId,
      stats: {
        invoices_count: invStat.count,
        total_sales: Math.round(invStat.totalSales * 100) / 100,
        services_count: srvStat.count,
        services_completed: srvStat.completedCount,
      },
    }
  })
}

export default async function StaffPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // Check if owner
  if (!context.isOwner) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center shadow-lg space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-black text-slate-900 dark:text-white">
          Owner Access Required
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Staff and permission management is reserved exclusively for the shop owner. If you require access adjustments, please contact the administrator.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace</span>
          </Link>
        </div>
      </div>
    )
  }

  const staffList = await getStaffData(context.organization_id, context.user.id)

  return (
    <StaffManagementDashboard
      initialStaff={staffList}
      currentUserEmail={context.user.email}
    />
  )
}
