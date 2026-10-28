import { listStates } from '../data/shopState.js'
import { status } from './shop.js'
import { withChatLock } from '../utils/chatQueue.js'

// Runs only while connected. Persistent state makes pending orders survive restarts.
export function startPaymentMonitor(sock, { intervalMs = 15000, onError = () => {} } = {}) {
  let stopped = false, running = false, cursor = 0
  async function tick() {
    if (stopped || running) return
    running = true
    try {
      const pending = listStates().flatMap(([jid,s]) => [s.order,...(s.orders || [])]
        .filter(o => o?.session && (o.status === 'paid' ? !o.customerNotified || !o.adminNotified : o.status === 'awaiting_payment' && o.paymentState !== 'expired'))
        .map(o => ({jid,id:o.id})))
      // Rotate bounded batches so large histories do not starve later orders.
      const batch = pending.length ? Array.from({length:Math.min(20,pending.length)},(_,i)=>pending[(cursor+i)%pending.length]) : []
      cursor = pending.length ? (cursor + batch.length) % pending.length : 0
      for (const {jid,id} of batch) {
        if (stopped) break
        try { await withChatLock(jid, () => stopped ? undefined : status(sock,jid,id,{automatic:true})) }
        catch { onError('A pending payment could not be checked; it will retry.') }
      }
    } finally { running = false }
  }
  const timer = setInterval(() => { void tick() }, intervalMs)
  timer.unref?.()
  void tick()
  return () => { stopped = true; clearInterval(timer) }
}
