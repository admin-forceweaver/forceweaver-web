import { createClient } from '@supabase/supabase-js'
import { Database } from '../database.types'

/**
 * Creates a Supabase client with service role key for admin operations.
 * This bypasses RLS policies and should only be used in server-side admin contexts.
 * 
 * SECURITY: Only use this in:
 * - Server-side admin pages (after middleware auth check)
 * - Admin API routes (after role verification)
 * - Never expose service role key to client
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseServiceKey) {
    console.warn('[Admin Client] SUPABASE_SERVICE_ROLE_KEY not set. Falling back to anon key.')
    // Fallback to anon key if service key not available
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) {
      throw new Error('Missing both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    return createClient<Database>(supabaseUrl, anonKey)
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

