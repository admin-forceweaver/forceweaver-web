import { createClient } from './client'

/**
 * Authentication utilities for Supabase
 * Domain: blueprint.forceweaver.com
 */
export const auth = {
  signUp: async (email: string, password: string) => {
    const supabase = createClient()
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : `${window.location.origin}/auth/callback`
    
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })
  },

  signInWithPassword: async (email: string, password: string) => {
    const supabase = createClient()
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  },

  signInWithOAuth: async (provider: 'google' | 'github' | 'azure') => {
    const supabase = createClient()
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : `${window.location.origin}/auth/callback`
    
    return await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    })
  },

  signOut: async () => {
    const supabase = createClient()
    return await supabase.auth.signOut()
  },

  getUser: async () => {
    const supabase = createClient()
    return await supabase.auth.getUser()
  },

  getSession: async () => {
    const supabase = createClient()
    return await supabase.auth.getSession()
  },

  resetPassword: async (email: string) => {
    const supabase = createClient()
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
      : `${window.location.origin}/reset-password`
    
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })
  },
}
