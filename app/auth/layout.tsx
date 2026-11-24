// app/auth/layout.tsx
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await supabase.auth.getUser()

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </div>
  )
}