// lib/auth.ts
import { supabase, supabaseService } from './supabase'
import { Session } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// In-memory fast cache to eliminate redundant remote DB round-trips on every button click & request
const userContextCache = new Map<string, { context: any; expiresAt: number }>()

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
      return { user, session: null }
    }
    return { user: null, session: null }
  } catch (err) {
    console.warn("getSession server notice:", err)
    return { user: null, session: null }
  }
}

/**
 * Fetches user details and their organization context from the DB.
 * Uses high-speed in-memory caching to prevent latency spikes on button clicks and API requests.
 */
export async function getCurrentUserContext() {
  const { user } = await getSession()
  if (!user) return null

  // Check in-memory cache first (0ms latency!)
  const cached = userContextCache.get(user.id)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.context
  }

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

  // 3. Upsert user profile only if it does not exist yet (brand new signup)
  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  if (!profile) {
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
  }

  // 4. Resolve Membership Role & Permissions
  const { data: membership } = await supabaseService
    .from('organization_memberships')
    .select('role')
    .eq('user_profile_id', user.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  const isOwner = membership?.role === 'Owner' || user.user_metadata?.role === 'Owner' || !user.user_metadata?.role
  const role: string = isOwner ? 'Owner' : (user.user_metadata?.role || 'Staff')
  const permissions: string[] = isOwner
    ? ['*']
    : (Array.isArray(user.user_metadata?.permissions) ? user.user_metadata.permissions : ['billing', 'services'])

  const result = {
    user,
    organization_id: orgId,
    role,
    isOwner,
    permissions,
  }

  // Cache for 3 minutes so repeated button clicks / API calls execute instantly in 0ms
  userContextCache.set(user.id, {
    context: result,
    expiresAt: Date.now() + 180_000,
  })

  return result
}

/**
 * Checks if a user's permissions grant access to a specific module.
 * Owners with '*' have access to everything.
 */
export function hasPermission(permissions: string[] | undefined, required: string): boolean {
  if (!permissions || permissions.length === 0) return false
  if (permissions.includes('*') || permissions.includes('all')) return true
  return permissions.includes(required)
}

export const auth = {
  getSession,
  getCurrentUserContext,
  hasPermission,
}
