const queues = new Map()
export async function withChatLock(jid, operation) {
  const previous = queues.get(jid) || Promise.resolve()
  const task = previous.catch(() => {}).then(operation)
  queues.set(jid, task)
  try { return await task } finally { if (queues.get(jid) === task) queues.delete(jid) }
}
