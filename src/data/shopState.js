import fs from 'node:fs'
import path from 'node:path'
const file = process.env.BOT_STATE_PATH || path.join(process.cwd(), 'src/data/shop-state.json')
let data = {}
if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'))
export function getState(jid) { return structuredClone(data[jid] || { cart: [], step: 'menu' }) }
export function setState(jid, state) {
  const next = { ...data, [jid]: state }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file + '.tmp', JSON.stringify(next, null, 2), { mode: 0o600 })
  // Windows scanners can briefly hold the destination between rapid updates.
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(file + '.tmp', file); break }
    catch (error) {
      if (!['EPERM','EACCES','EBUSY'].includes(error.code) || attempt >= 3) throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10 * (attempt + 1))
    }
  }
  data = next
}

export function listStates() { return Object.entries(structuredClone(data)) }
