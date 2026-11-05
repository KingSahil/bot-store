// src/utils/resolveLid.js
import fs from 'fs'
import path from 'path'
import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { botConfig } from '../config.js'

const lidCache = new Map()

/**
 * Resolves a WhatsApp LID (e.g. 90985040191717@lid) to its actual phone number JID 
 * If the JID is already a standard phone JID (@s.whatsapp.net), it is returned normalized.
 */
export function resolveLidToPn(jid) {
  if (!jid) return jid
  if (!jid.endsWith('@lid')) return jidNormalizedUser(jid)

  const lidUser = jid.split('@')[0].split(':')[0]
  if (lidCache.has(lidUser)) {
    return lidCache.get(lidUser)
  }

  // 1. Check reverse file in session/
  try {
    const reverseFile = path.join(botConfig.authDir, `lid-mapping-${lidUser}_reverse.json`)
    if (fs.existsSync(reverseFile)) {
      const pn = JSON.parse(fs.readFileSync(reverseFile, 'utf8'))
      if (pn) {
        const resolved = jidNormalizedUser(`${pn}@s.whatsapp.net`)
        lidCache.set(lidUser, resolved)
        return resolved
      }
    }
  } catch (_) { }

  // 2. Scan all lid-mapping-*.json files in session/
  try {
    const sessionDir = botConfig.authDir
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir)
      for (const file of files) {
        if (file.startsWith('lid-mapping-') && !file.includes('_reverse') && file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(sessionDir, file), 'utf8').trim()
          if (content.includes(lidUser)) {
            const pn = file.replace('lid-mapping-', '').replace('.json', '')
            const resolved = jidNormalizedUser(`${pn}@s.whatsapp.net`)
            lidCache.set(lidUser, resolved)
            return resolved
          }
        }
      }
    }
  } catch (_) { }

  return jidNormalizedUser(jid)
}
