'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
  LayoutDashboard,
  Users,
  Receipt,
  Warehouse,
  ShoppingCart,
  Wrench,
  BarChart3,
  UserCheck,
  FileSpreadsheet,
  Wallet,
  Target,
  CalendarCheck,
  Inbox,
} from 'lucide-react'
import { HeaderNav } from './HeaderNav'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Target,
  Inbox,
  Receipt,
  FileSpreadsheet,
  Wrench,
  Users,
  Warehouse,
  ShoppingCart,
  BarChart3,
  CalendarCheck,
  Wallet,
  UserCheck,
}

export interface NavItem {
  name: string
  href: string
  iconName: string
  perm: string
}

interface DashboardShellProps {
  children: React.ReactNode
  orgName: string
  userEmail?: string
  userName?: string
  role?: string
  isOwner?: boolean
  allowedNav: NavItem[]
}

export function DashboardShell({
  children,
  orgName,
  userEmail,
  userName,
  role = 'Staff',
  isOwner = false,
  allowedNav,
}: DashboardShellProps) {
  const pathname = usePathname()

  // State: Sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  // State: Screen full-width mode (occupies entire screen width)
  const [isFullWidth, setIsFullWidth] = useState(false)
  // State: Browser OS fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Load user preference from localStorage on mount
  useEffect(() => {
    try {
      const savedSidebar = localStorage.getItem('gnapika_sidebar_open')
      if (savedSidebar !== null) {
        setIsSidebarOpen(savedSidebar === 'true')
      }
      const savedWidth = localStorage.getItem('gnapika_full_width')
      if (savedWidth !== null) {
        setIsFullWidth(savedWidth === 'true')
      }
    } catch {}

    // Check if initial screen is small (auto-collapse on mobile)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }, [])

  // Keyboard shortcut: Ctrl + B or Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem('gnapika_sidebar_open', String(next))
      } catch {}
      return next
    })
  }

  const toggleFullWidth = () => {
    setIsFullWidth((prev) => {
      const next = !prev
      try {
        localStorage.setItem('gnapika_full_width', String(next))
      } catch {}
      return next
    })
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 lg:hidden print:hidden transition-opacity animate-in fade-in"
          aria-hidden="true"
        />
      )}

      <div className="flex flex-1 relative overflow-x-hidden">
        {/* ========================================================
            SIDEBAR (Collapsible & Expandable)
        ======================================================== */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-lg shadow-slate-900/5 print:hidden transition-all duration-300 ease-in-out ${
            isSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }`}
        >
          {/* Brand Header & Quick Collapse */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 overflow-hidden group"
              title="Go to Dashboard"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                  {orgName}
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  Billing, Services &amp; CRM
                </p>
              </div>
            </Link>

            {/* Collapse Button inside Sidebar */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Collapse Sidebar (Ctrl + B)"
              aria-label="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {allowedNav.map((item) => {
              const Icon = iconMap[item.iconName] || LayoutDashboard
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    // Auto-close on mobile after clicking
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setIsSidebarOpen(false)
                    }
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-primary'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer: Settings (Owner Only) & Shortcut Hint */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {isOwner && (
              <Link
                href="/dashboard/settings"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  pathname.startsWith('/dashboard/settings')
                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Settings</span>
              </Link>
            )}

            <div className="px-3.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Toggle sidebar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9px] font-bold text-slate-600 dark:text-slate-300">
                Ctrl+B
              </kbd>
            </div>
          </div>
        </aside>

        {/* ========================================================
            MAIN CONTENT WRAPPER
            Dynamically shifts when sidebar is open/closed
        ======================================================== */}
        <div
          className={`flex-1 flex flex-col min-h-screen min-w-0 print:ml-0 print:p-0 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'lg:ml-64' : 'ml-0'
          }`}
        >
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs print:hidden gap-3">
            {/* Left Controls: Sidebar Toggle + Fullscreen + Badge */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* 1. Sidebar Toggle Button */}
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                title={isSidebarOpen ? 'Hide Sidebar to occupy full page (Ctrl+B)' : 'Show Sidebar (Ctrl+B)'}
                aria-label="Toggle Sidebar"
              >
                {isSidebarOpen ? (
                  <>
                    <PanelLeftClose className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline text-[11px]">Hide Sidebar</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="w-4 h-4 text-primary" />
                    <span className="text-[11px] text-primary font-bold">Show Sidebar</span>
                  </>
                )}
              </button>
              

              {/* 3. Browser OS Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Status / Brand Badge */}
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                <span className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Gnapika Terminal
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  Online
                </span>
              </div>
            </div>

            {/* Right Controls: User Profile & Actions */}
            <HeaderNav
              userEmail={userEmail}
              userName={userName}
              role={role}
              isOwner={isOwner}
            />
          </header>

          {/* Page Main Content: dynamically boxed or edge-to-edge */}
          <main
            className={`flex-1 transition-all duration-300 print:p-0 print:max-w-none print:m-0 ${
              isFullWidth || !isSidebarOpen
                ? 'w-full max-w-none px-4 sm:px-6 lg:px-8 py-6'
                : 'max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
