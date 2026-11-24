import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Global cache to avoid duplicate GoTrueClient instances in HMR
declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined
  // eslint-disable-next-line no-var
  var __supabaseServiceClient: SupabaseClient | undefined
}

// Browser/public client (uses Anon Key with Cookie persistence via @supabase/ssr)
export function getSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined' && globalThis.__supabaseClient) {
    return globalThis.__supabaseClient
  }

  const client =
    typeof window !== 'undefined'
      ? createBrowserClient(supabaseUrl, supabaseAnonKey)
      : createClient(supabaseUrl, supabaseAnonKey)

  if (typeof window !== 'undefined') {
    globalThis.__supabaseClient = client as any
  }
  return client as any
}

export const supabase = getSupabaseClient()

// Server-side privileged client (uses Service Role Key)
// MUST only be used on the server (API routes / server actions)
export function getSupabaseServiceClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    console.warn('Attempted to access supabaseService on client. Falling back to public client.')
    return getSupabaseClient()
  }

  if (globalThis.__supabaseServiceClient) {
    return globalThis.__supabaseServiceClient
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  const client = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  globalThis.__supabaseServiceClient = client
  return client
}

// Proxy for backwards compatibility with existing server imports
export const supabaseService: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseServiceClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
