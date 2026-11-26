// app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  KeyRound,
} from 'lucide-react'
import { GNAPIKA_LOGO_BASE64, GNAPIKA_WATERMARK_BASE64 } from '@/lib/brandAssets'
import { SHOP_DETAILS } from '@/lib/formatters'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        toast.error(error.message || 'Login failed. Please verify your email and password.')
      } else {
        toast.success(`Welcome back! Authenticated as ${data.user?.user_metadata?.full_name || data.user?.email}`)
        router.refresh()
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unexpected login error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 font-sans overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-amber-600/15 via-orange-600/15 to-blue-600/15 blur-3xl rounded-full pointer-events-none" />

      {/* Subtle Background Watermark Logo */}
      <img
        src={GNAPIKA_WATERMARK_BASE64}
        alt="Watermark"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 max-w-[500px] opacity-[0.04] select-none"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Main Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 p-8 sm:p-9 shadow-2xl rounded-3xl text-slate-100 space-y-6">
          {/* Official Shop Logo & Title */}
          <div className="text-center space-y-3">
            <div className="w-72 max-w-full mx-auto p-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
              <img
                src={GNAPIKA_LOGO_BASE64}
                alt="Gnapika Computer Shopee"
                className="w-full h-auto max-h-16 object-contain block mx-auto filter drop-shadow-md"
              />
            </div>

            <div className="pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Authorized Staff Portal</span>
              </div>
              <h2 className="text-lg font-black text-white mt-2">
                Sign In to Terminal
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Billing, Inventory &amp; Service Management System
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Staff Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@gnapika.com"
                  autoComplete="email"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Password Field with Toggle */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-500 italic">Issued by Owner</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-6 py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Access Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Owner Notice & Security Note */}
          <div className="pt-4 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[11px] text-slate-400">
              Staff accounts are created and configured by the shop administrator.
            </p>
            <p className="text-[10px] text-slate-600 font-mono">
              Phone: {SHOP_DETAILS.phone} | GSTIN: {SHOP_DETAILS.gstin}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}