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
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Payment service is unavailable. Your order is saved. Please try again.')
  return data
}
