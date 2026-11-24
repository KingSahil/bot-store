// Reset the cutoff for each connection so offline backlog is never replayed.
export function createNewMessageFilter() {
  let connectedAt = null
  const seen = new Set()
  const queued = new Set()
  return {
    connected(now = Date.now()) {
      connectedAt = Math.floor(now / 1000)
    },
    disconnected() {
      connectedAt = null
      queued.clear()
    },
    recordQueuedFrame(id, timestamp) {
      if (connectedAt === null || !id || !Number.isFinite(timestamp) || timestamp < connectedAt) return
      queued.add(id)
      if (queued.size > 10000) queued.delete(queued.values().next().value)
    },
    accepts(type, message) {
      const id = message?.key?.id
      if (connectedAt === null || !id || !message.message || message.key.fromMe) return false
      // Baileys emits server-queued frames as append, even if sent during this connection.
      if (type !== 'notify' && (type !== 'append' || !queued.delete(id))) return false
      const raw = message.messageTimestamp
      const timestamp = typeof raw?.toNumber === 'function' ? raw.toNumber() : Number(raw)
      if (!Number.isFinite(timestamp) || timestamp < connectedAt || seen.has(message.key.id)) return false
      seen.add(message.key.id)
      if (seen.size > 10000) seen.delete(seen.values().next().value)
      return true
    },
  }
}
