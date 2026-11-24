// lib/auth.ts
import { supabase, supabaseService } from './supabase'
import { Session } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates an SSR server client in Next.js Server Components / Route Handlers
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Can be ignored if called from Server Component
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Can be ignored if called from Server Component
          }
        },
      },
    }
  )
}

/**
 * Retrieves the active Supabase session (works both on client and server).
 */
export async function getSession(): Promise<{ user: any; session: Session | null }> {
  if (typeof window !== 'undefined') {
    const { data: { session } } = await supabase.auth.getSession()
    return { user: session?.user || null, session }
  }

  try {
    const serverClient = createSupabaseServerClient()
    const { data: { user }, error: userError } = await serverClient.auth.getUser()
    if (user && !userError) {
      const { data: { session } } = await serverClient.auth.getSession()
      return { user, session: session || null }
    }
    return { user: null, session: null }
  } catch (err) {
    console.warn("getSession server notice:", err)
    return { user: null, session: null }
  }
}

/**
 * Fetches user details and their organization context from the DB.
 * Automatically provisions an organization/membership if the user is newly signed up.
 */
export async function getCurrentUserContext() {
  const { user } = await getSession()
  if (!user) return null

  // 1. Find profile by user ID or email using privileged client
  let { data: profile } = await supabaseService
    .from('user_profiles')
    .select('id, organization_id, email, full_name')
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle()

  // 2. Ensure an organization exists
  let orgId = profile?.organization_id
  if (!orgId) {
    const { data: existingOrg } = await supabaseService
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existingOrg) {
      orgId = existingOrg.id
    } else {
      const { data: newOrg } = await supabaseService
        .from('organizations')
        .insert([{ name: 'Gnapika Computer Shopee' }])
        .select('id')
        .single()
      orgId = newOrg?.id
    }
  }

  // 3. Upsert user profile to guarantee user.id is matched
  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  if (!profile || profile.id !== user.id) {
    const { data: upsertedProfile } = await supabaseService
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          organization_id: orgId,
          email: user.email,
          full_name: fullName,
        },
        { onConflict: 'id' }
      )
      .select('id, organization_id, email, full_name')
      .single()

    if (upsertedProfile) {
      profile = upsertedProfile
    }
  }

  // 4. Ensure organization membership exists
  if (user.id && orgId) {
    await supabaseService
      .from('organization_memberships')
      .upsert(
        {
          user_profile_id: user.id,
          organization_id: orgId,
          role: 'Owner',
        },
        { onConflict: 'user_profile_id,organization_id' }
      )
  }

  return { user, organization_id: orgId }
}

export const auth = {
  getSession,
  getCurrentUserContext,
}
