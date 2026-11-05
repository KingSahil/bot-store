import 'dotenv/config'
import path from 'node:path'
import { parseAllowedNumbers } from './utils/allowedNumbers.js'

export const BOARD_LABELS = Object.freeze({ normal: 'Normal stock', preorder: 'Pre-order stock', wholesale: 'Wholesale stock' })

export function resolveConfig(env = process.env, cwd = process.cwd()) {
  const explicit = Boolean(env.BOT_MODE)
  const mode = env.BOT_MODE || 'normal'
  if (!Object.hasOwn(BOARD_LABELS, mode)) throw new Error('BOT_MODE must be normal, preorder or wholesale.')
  const root = path.resolve(cwd, 'runtime', mode)
  const authDir = path.resolve(cwd, env.SESSION_DIR || (explicit ? path.join(root, 'session') : 'session'))
  const stateFile = path.resolve(cwd, env.BOT_STATE_PATH || (explicit ? path.join(root, 'shop-state.json') : 'src/data/shop-state.json'))
  const expectedNumber = (env.BOT_PHONE_NUMBER || '').replace(/[+\s()-]/g, '')
  if (expectedNumber && !/^\d{7,15}$/.test(expectedNumber)) throw new Error('BOT_PHONE_NUMBER must be an international number containing 7–15 digits.')
  const allowedNumbers = Object.freeze(parseAllowedNumbers(env.ALLOWED_NUMBERS))
  return Object.freeze({ mode, label: BOARD_LABELS[mode], authDir, stateFile, expectedNumber, allowedNumbers })
}

export const botConfig = resolveConfig()
