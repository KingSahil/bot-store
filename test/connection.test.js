import test from 'node:test'
import assert from 'node:assert/strict'
import { acquireSessionGuard, reconnectDelay } from '../src/utils/connectionGuard.js'
test('replaced connections stop; network failures back off; pairing restart retries', () => {
  for (const code of [440,401,500,411,403]) assert.equal(reconnectDelay(code), null)
  assert.equal(reconnectDelay(515,4),1000)
  assert.deepEqual([0,1,2,3,4,5,6].map(n=>reconnectDelay(408,n)),[2000,4000,8000,16000,32000,60000,60000])
})
test('only one process can reserve the session; reservation releases on close', async () => {
  const dir = `connection-test-${process.pid}`
  const guard = await acquireSessionGuard(dir)
  try { await assert.rejects(acquireSessionGuard(dir), /already using this session/) }
  finally { await new Promise(resolve=>guard.close(resolve)) }
  const replacement = await acquireSessionGuard(dir)
  await new Promise(resolve=>replacement.close(resolve))
})

test('replacement asks the old owner to stop before acquiring its reservation', async () => {
  const dir = `connection-replace-test-${process.pid}`
  let stopped = false
  const old = await acquireSessionGuard(dir, { onReplace: async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
    await new Promise(resolve => old.close(resolve))
    stopped = true
  } })
  const replacement = await acquireSessionGuard(dir, { replace: true })
  assert.equal(stopped,true)
  await new Promise(resolve=>replacement.close(resolve))
})
