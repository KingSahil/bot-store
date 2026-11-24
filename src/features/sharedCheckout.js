import { STORE_URL } from '../data/deepgmart.js'

export function sharedCheckoutEnabled() {
  return (process.env.BOT_CHECKOUT_SECRET || '').length >= 32
}
export async function sharedCheckout(body = null, sessionId = null) {
  if (!sharedCheckoutEnabled()) throw new Error('Online checkout is being connected. Your cart is saved; please contact the store or choose cash on delivery if available.')
  const endpoint = new URL('/api/bot/checkout', process.env.BOT_CHECKOUT_URL || STORE_URL)
  if (endpoint.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)) throw new Error('Checkout must use a secure HTTPS address.')
  if (sessionId) endpoint.searchParams.set('session_id', sessionId)
  const response = await fetch(endpoint, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.BOT_CHECKOUT_SECRET}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000), redirect: 'manual',
  })
  const unavailable = 'Online payment is temporarily unavailable. Your cart is saved. Please try again later.'
  if (!response.headers.get('content-type')?.includes('application/json')) {
    console.warn(`[checkout] ${endpoint.origin} returned HTTP ${response.status} without a checkout response.`)
    throw new Error(unavailable)
  }
  const data = await response.json().catch(() => null)
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(unavailable)
  if (!response.ok) throw new Error(response.status < 500 && typeof data.error === 'string' ? data.error : unavailable)
  return data
}
