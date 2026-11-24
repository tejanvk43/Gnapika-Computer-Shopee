// app/page.tsx
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase' // Use public client for initial check

export default async function HomePage() {
  // Simple check: redirect unauthenticated users to auth flow
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }
  // If authenticated, redirect to the main dashboard area
  redirect('/dashboard')
}