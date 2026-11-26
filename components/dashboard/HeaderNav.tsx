'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, User, ShieldCheck, Shield } from 'lucide-react'
import { toast } from 'sonner'

export function HeaderNav({
  userEmail,
  userName,
  role = 'Staff',
  isOwner = false,
}: {
  userEmail?: string
  userName?: string
  role?: string
  isOwner?: boolean
}) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      router.push('/auth/login')
      router.refresh()
    } catch (err: any) {
      toast.error('Error logging out')
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* User & Role Badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <User className="w-3.5 h-3.5 text-primary" />
        <span className="font-semibold">{userName || userEmail || 'Staff'}</span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isOwner
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}
        >
          {isOwner ? 'Owner' : role || 'Staff'}
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
        title="Sign Out"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Logout</span>
      </button>
    </div>
  )
}
