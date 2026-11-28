// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import { DashboardShell, NavItem } from '@/components/dashboard/DashboardShell'

const allNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', iconName: 'LayoutDashboard', perm: '*' },
  { name: 'CRM & Pipeline', href: '/dashboard/crm', iconName: 'Target', perm: 'customers' },
  { name: 'App Requests & Chat', href: '/dashboard/customer-requests', iconName: 'Inbox', perm: '*' },
  { name: 'Billing / POS', href: '/dashboard/billing', iconName: 'Receipt', perm: 'billing' },
  { name: 'Quotations', href: '/dashboard/quotations', iconName: 'FileSpreadsheet', perm: '*' },
  { name: 'Services', href: '/dashboard/services', iconName: 'Wrench', perm: 'services' },
  { name: 'Customers', href: '/dashboard/customers', iconName: 'Users', perm: 'customers' },
  { name: 'Inventory', href: '/dashboard/inventory', iconName: 'Warehouse', perm: 'inventory' },
  { name: 'Purchases', href: '/dashboard/purchases', iconName: 'ShoppingCart', perm: 'purchases' },
  { name: 'Reports', href: '/dashboard/reports', iconName: 'BarChart3', perm: 'reports' },
  { name: 'Attendance', href: '/dashboard/attendance', iconName: 'CalendarCheck', perm: 'staff_only' },
  { name: 'Daily Expenses', href: '/dashboard/expenses', iconName: 'Wallet', perm: 'staff_only' },
  { name: 'Staff & Roles', href: '/dashboard/staff', iconName: 'UserCheck', perm: 'staff_only' },
]

async function getSidebarData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const { data: org } = await supabaseService
    .from('organizations')
    .select('name')
    .eq('id', context.organization_id)
    .maybeSingle()

  return {
    orgName: org?.name || 'Gnapika Computer Shopee',
    userEmail: context.user?.email,
    userName: context.user?.user_metadata?.full_name,
    role: context.role,
    isOwner: context.isOwner,
    permissions: context.permissions,
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgName, userEmail, userName, role, isOwner, permissions } = await getSidebarData()

  // Filter navigation links dynamically based on role & permissions
  const allowedNav = allNavigation.filter((item) => {
    if (isOwner) return true
    if (item.perm === 'staff_only') return false
    if (item.perm === '*') return true
    if (item.perm === 'customers') {
      return (
        hasPermission(permissions, 'billing') ||
        hasPermission(permissions, 'services') ||
        hasPermission(permissions, 'customers')
      )
    }
    return hasPermission(permissions, item.perm)
  })

  return (
    <DashboardShell
      orgName={orgName}
      userEmail={userEmail}
      userName={userName}
      role={role}
      isOwner={isOwner}
      allowedNav={allowedNav}
    >
      {children}
    </DashboardShell>
  )
}