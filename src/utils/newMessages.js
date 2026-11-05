// Reset the cutoff for each connection so offline backlog is never replayed.
export function createNewMessageFilter() {
  let connectedAt = null
  const seen = new Set()
  return {
    connected(now = Date.now()) {
      connectedAt = Math.floor(now / 1000)
    },
    disconnected() { connectedAt = null },
    accepts(type, message) {
      if (connectedAt === null || type !== 'notify' || !message?.message || message.key?.fromMe || !message.key?.id) return false
      const raw = message.messageTimestamp
      const timestamp = typeof raw?.toNumber === 'function' ? raw.toNumber() : Number(raw)
      if (!Number.isFinite(timestamp) || timestamp < connectedAt || seen.has(message.key.id)) return false
      seen.add(message.key.id)
      if (seen.size > 10000) seen.delete(seen.values().next().value)
      return true
    },
  }
}
