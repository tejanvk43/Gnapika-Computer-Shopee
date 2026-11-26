// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Receipt,
  Package,
  Warehouse,
  ShoppingCart,
  Wrench,
  BarChart3,
  Settings,
  Building2,
} from 'lucide-react'
import { HeaderNav } from '@/components/dashboard/HeaderNav'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Billing / POS', href: '/dashboard/billing', icon: Receipt },
  { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingCart },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Services', href: '/dashboard/services', icon: Wrench },
  { name: 'Reports', href: '/dashboard/reports', icon: 'BarChart3' as any, iconComponent: BarChart3 },
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
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgName, userEmail, userName } = await getSidebarData()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col shadow-sm print:hidden">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{orgName}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Billing & Services</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.iconComponent || item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
                >
                  <Icon className="w-4 h-4 text-slate-500 group-hover:text-primary" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer Settings */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Settings</span>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen print:ml-0 print:p-0">
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-3.5 flex items-center justify-between shadow-xs print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white text-sm">Workspace</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200">
                Live
              </span>
            </div>
            <HeaderNav userEmail={userEmail} userName={userName} />
          </header>

          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none print:m-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}