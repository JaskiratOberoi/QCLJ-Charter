import { create } from 'zustand'

/** Origin of the lab server (nginx behind api-qclj). Empty in dev: the vite server stands in. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const KEY = 'qclj-auth'

const stored = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

interface AuthState {
  /** base64 "id:password" for HTTP Basic, or null when signed out. */
  cred: string | null
  labId: string | null
}

const labIdOf = (cred: string | null) => {
  if (!cred) return null
  try {
    return atob(cred).split(':')[0] || null
  } catch {
    return null
  }
}

export const useAuth = create<AuthState>(() => ({ cred: stored(), labId: labIdOf(stored()) }))

export const hasAuth = () => !!useAuth.getState().cred

/** Authorization header for requests to the lab server. */
export function authHeaders(): HeadersInit {
  const c = useAuth.getState().cred
  return c ? { Authorization: `Basic ${c}` } : {}
}

export function signOut() {
  try {
    localStorage.removeItem(KEY)
  } catch { /* storage unavailable */ }
  useAuth.setState({ cred: null, labId: null })
}

/**
 * Checks the lab ID + password against the lab server (nginx Basic auth on /auth/check)
 * and keeps the credential for later record fetches. Returns an error message or null.
 */
export async function signIn(id: string, password: string): Promise<string | null> {
  const cred = btoa(`${id.trim()}:${password}`)
  let res: Response
  try {
    res = await fetch(`${API_BASE}/auth/check`, { method: 'GET', headers: { Authorization: `Basic ${cred}` }, cache: 'no-store' })
  } catch {
    return 'Could not reach the lab server. Check your connection and try again.'
  }
  if (res.status === 401 || res.status === 403) return 'Lab ID or password is incorrect.'
  if (!res.ok) return `Lab server answered ${res.status}. Try again in a moment.`
  try {
    localStorage.setItem(KEY, cred)
  } catch { /* storage unavailable: session only */ }
  useAuth.setState({ cred, labId: id.trim() })
  return null
}
