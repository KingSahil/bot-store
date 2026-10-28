import net from 'node:net'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { DisconnectReason } from '@whiskeysockets/baileys'

export async function acquireSessionGuard(authDir, { replace = false, onReplace } = {}) {
  const key = path.resolve(authDir)
  const normalized = process.platform === 'win32' ? key.toLowerCase() : key
  const identity = createHash('sha256').update(normalized).digest('hex')
  const port = 20000 + Number.parseInt(identity.slice(0,8),16) % 40000
  const request = `bot-store-replace:${identity}\n`
  let requested = false
  for (let attempt = 0; attempt < 100; attempt++) {
    const server = net.createServer(socket => {
      socket.setTimeout(2000, () => socket.destroy())
      socket.on('error', () => {})
      let input = ''
      socket.on('data', chunk => {
        input += chunk.toString()
        if (input.length > 200) return socket.destroy()
        if (!input.includes('\n')) return
        if (input !== request || !onReplace) return socket.end('rejected\n')
        socket.end('replacing\n')
        Promise.resolve().then(onReplace).catch(() => {})
      })
    })
    try {
      await new Promise((resolve, reject) => {
        const fail = error => { server.close(); reject(error) }
        server.once('error', fail)
        server.listen({ host: '127.0.0.1', port, exclusive: true }, () => { server.removeListener('error', fail); resolve() })
      })
      return server
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error
      if (!replace) throw new Error('Another bot is already using this session folder.')
      if (!requested) {
        await new Promise((resolve, reject) => {
          const socket = net.connect({ host: '127.0.0.1', port })
          let response = ''
          socket.setTimeout(2000, () => socket.destroy(new Error('Previous bot did not respond.')))
          socket.once('connect', () => socket.write(request))
          socket.on('data', chunk => { response += chunk.toString(); if (response.includes('\n')) socket.end() })
          socket.once('error', reject)
          socket.once('end', () => { socket.destroy(); response === 'replacing\n' ? resolve() : reject(new Error('Port belongs to another service; it was left untouched.')) })
        })
        requested = true
        console.log('Stopping the previous bot before starting this instance...')
      }
      await new Promise(resolve => setTimeout(resolve,100))
    }
  }
  throw new Error('Previous bot did not stop in time. New connection was not started.')
}
export function reconnectDelay(code, attempt = 0) {
  if ([DisconnectReason.connectionReplaced, DisconnectReason.loggedOut, DisconnectReason.badSession, DisconnectReason.multideviceMismatch, DisconnectReason.forbidden].includes(code)) return null
  if (code === DisconnectReason.restartRequired) return 1000
  return Math.min(60000, 2000 * 2 ** Math.min(attempt, 5))
}
