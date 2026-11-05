import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { BOARD_LABELS, resolveConfig } from '../src/config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const mode = process.argv[2]
if (!Object.hasOwn(BOARD_LABELS, mode)) throw new Error('Usage: node scripts/start-bot.js normal|preorder|wholesale')
// Shared credentials first, then this instance's overrides. Never print secrets.
dotenv.config({ path: path.join(root, '.env') })
dotenv.config({ path: path.join(root, 'config', `${mode}.env`), override: true })
process.env.BOT_MODE = mode
// Named launchers always use isolated paths, even if a legacy .env has paths.
process.env.SESSION_DIR = path.join(root, 'runtime', mode, 'session')
process.env.BOT_STATE_PATH = path.join(root, 'runtime', mode, 'shop-state.json')
const config = resolveConfig()
console.log(`Starting DeepGmart — ${config.label}. Pair only this bot's WhatsApp number.`)
// config.js was loaded before the profile; index runs in a fresh child process.
const { spawn } = await import('node:child_process')
const child = spawn(process.execPath, ['index.js'], { cwd: root, env: process.env, stdio: 'inherit' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
