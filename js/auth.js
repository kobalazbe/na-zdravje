/* ===========================================================
   auth.js — Supabase client + auth helpers
   The supabase client is the single instance used across the app.
   =========================================================== */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://ykheihwdgogfmjadmnhn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_sHA6GWfpGR6SLQUr115nqg_BvvzLgaL'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email, password, displayName) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      // Where the "Confirm your email" link sends the user back to
      emailRedirectTo: window.location.origin + window.location.pathname,
      // Stored on the user so we can greet them by name instead of email
      data: displayName ? { display_name: displayName } : undefined,
    },
  })
}

/* Best display name for a user: chosen name → Google name → email local part */
export function displayName(user) {
  if (!user) return ""
  const m = user.user_metadata || {}
  return m.display_name || m.full_name || m.name
      || (user.email ? user.email.split("@")[0] : "Igralec")
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('tier, pass_expiry')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
}

export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword })
}

export async function getCustomCards(userId, mode, difficulty) {
  return supabase
    .from('custom_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .eq('difficulty', difficulty)
    .order('created_at', { ascending: false })
}

export async function addCustomCard(userId, card) {
  return supabase
    .from('custom_cards')
    .insert({ user_id: userId, ...card })
    .select()
    .single()
}

export async function deleteCustomCard(id) {
  return supabase.from('custom_cards').delete().eq('id', id)
}
