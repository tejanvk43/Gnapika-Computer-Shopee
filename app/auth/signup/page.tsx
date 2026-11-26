// app/auth/signup/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft, ShieldAlert } from 'lucide-react'
import { GNAPIKA_LOGO_BASE64 } from '@/lib/brandAssets'

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    // Automatically redirect to login after a short delay
    const timer = setTimeout(() => {
      router.replace('/auth/login')
    }, 4000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl rounded-3xl text-center space-y-5">
        <div className="w-64 max-w-full mx-auto">
          <img
            src={GNAPIKA_LOGO_BASE64}
            alt="Gnapika Computer Shopee"
            className="w-full h-auto max-h-16 object-contain mx-auto"
          />
        </div>

        <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Public Registration Disabled
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Staff and operator accounts are strictly managed and issued by the shop owner. Please contact the administrator for your access credentials.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/auth/login"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Staff Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}