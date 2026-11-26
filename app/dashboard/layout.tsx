// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext, hasPermission } from '@/lib/auth'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Receipt,
  Warehouse,
  ShoppingCart,
  Wrench,
  BarChart3,
  Settings,
  Building2,
  UserCheck,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react'
import { HeaderNav } from '@/components/dashboard/HeaderNav'

const allNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, perm: '*' },
  { name: 'Billing / POS', href: '/dashboard/billing', icon: Receipt, perm: 'billing' },
  { name: 'Quotations', href: '/dashboard/quotations', icon: FileSpreadsheet, perm: '*' },
  { name: 'Services', href: '/dashboard/services', icon: Wrench, perm: 'services' },
  { name: 'Customers', href: '/dashboard/customers', icon: Users, perm: 'customers' },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse, perm: 'inventory' },
  { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingCart, perm: 'purchases' },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, perm: 'reports' },
  { name: 'Staff & Roles', href: '/dashboard/staff', icon: UserCheck, perm: 'staff_only' },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col shadow-sm print:hidden">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                {orgName}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Billing &amp; Services
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {allowedNav.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
                >
                  <Icon className="w-4 h-4 text-slate-500 group-hover:text-primary shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer: Settings (Owner Only) */}
          {isOwner && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Settings</span>
              </Link>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen print:ml-0 print:p-0">
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-3 flex items-center justify-between shadow-xs print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Gnapika Terminal
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                Connected
              </span>
            </div>
            <HeaderNav
              userEmail={userEmail}
              userName={userName}
              role={role}
              isOwner={isOwner}
            />
          </header>

          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none print:m-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}