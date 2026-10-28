#!/usr/bin/env node
import { startPaymentMonitor } from './src/features/paymentMonitor.js';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion, makeCacheableSignalKeyStore, jidNormalizedUser } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import figlet from 'figlet';
import dotenv from 'dotenv';
import qrcode from 'qrcode-terminal';
import { handler } from './src/handler.js';
import { wrapSendMessageGlobally, botSentMessageIds, storeMessage, messageStore } from './src/utils/typing.js';
import { acquireSessionGuard, reconnectDelay } from './src/utils/connectionGuard.js';
import { resolveLidToPn } from './src/utils/resolveLid.js';

dotenv.config({ debug: false });

const originalError = console.error;
const originalLog = console.log;
const originalStdoutWrite = process.stdout.write;
const FILTER_PATTERNS = [
  'Bad MAC',
  'Failed to decrypt message with any known session',
  'Session error:',
  'Failed to decrypt',
  'Closing open session',
  'Closing session:',
  'SessionEntry',
  '_chains:',
  'registrationId:',
  'currentRatchet:',
  'indexInfo:',
  '<Buffer',
  'pubKey:',
  'privKey:',
  'baseKey:',
  'remoteIdentityKey:',
  'lastRemoteEphemeralKey:',
  'ephemeralKeyPair:',
  'chainKey:',
  'chainType:',
  'messageKeys:',
  'previousCounter:',
  'rootKey:'
];

process.stdout.write = function (chunk, encoding, callback) {
  const str = chunk.toString();
  const shouldFilter = FILTER_PATTERNS.some(pattern => str.includes(pattern));

  if (shouldFilter) {
    if (str.includes('Closing open session')) {
      const cleanMsg = '🔄 Signal Protocol: Updating encryption session...\n';
      return originalStdoutWrite.call(this, Buffer.from(cleanMsg), encoding, callback);
    }

    if (typeof callback === 'function') callback();
    return true;
  }

  return originalStdoutWrite.call(this, chunk, encoding, callback);
};

console.error = function (...args) {
  const msg = args.join(' ');

  if (FILTER_PATTERNS.some(pattern => msg.includes(pattern))) {
    if (msg.includes('Bad MAC')) {
      originalLog(chalk.yellow('🔒 Signal Protocol: Updating encryption session...'));
    }
    return;
  }

  originalError.apply(console, args);
};

console.log = function (...args) {
  const msg = args.join(' ');

  if (FILTER_PATTERNS.some(pattern => msg.includes(pattern))) {
    return;
  }

  originalLog.apply(console, args);
};

const authDir = path.join(process.cwd(), 'session');
const msgRetryCounterCache = new NodeCache();

function centerText(text) {
  const lines = text.split('\n');
  const width = process.stdout.columns || 80;
  return lines
    .map(line => {
      const pad = Math.max(0, Math.floor((width - line.length) / 2));
      return ' '.repeat(pad) + line;
    })
    .join('\n');
}

let isFirstStart = true;
let activeSocket = null;
let stopPaymentMonitor = () => {};
let reconnectTimer = null;
let starting = false;
let reconnectAttempt = 0;
let shuttingDown = false;
let saveActiveCreds = null;

function showBanner() {
  if (isFirstStart) {
    console.clear();
    isFirstStart = false;
  }
  const text = figlet.textSync('Bot - Store', { font: 'Slant' });
  console.log(chalk.cyanBright(centerText(text)));

  const desc = 'WhatsApp bot store for selling products';
  const line = '─'.repeat(desc.length);
  console.log(chalk.greenBright(centerText(desc)));
  console.log(chalk.gray(centerText(line)) + '\n');
}

async function startBot() {
  if (starting || shuttingDown) return;
  starting = true;
  try {
  showBanner();

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  saveActiveCreds = saveCreds;
  const { version } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1051853186] }));

  if (shuttingDown) return;
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger: pino({ level: 'silent' }),
    msgRetryCounterCache,
    getMessage: async (key) => {
      if (key?.id && messageStore.has(key.id)) {
        return messageStore.get(key.id);
      }
      return undefined;
    },
  });

  activeSocket = sock;
  let closed = false;
  wrapSendMessageGlobally(sock);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(chalk.cyanBright('\n📷 Scan this QR code with WhatsApp:\n'));
      qrcode.generate(qr, { small: true });
      console.log(chalk.yellowBright('📱 Open WhatsApp → Settings (or ⋮) → Linked Devices → Link a Device\n'));
    }

    if (activeSocket !== sock || closed || shuttingDown) return;
    if (connection === 'open') {
      stopPaymentMonitor();
      stopPaymentMonitor = startPaymentMonitor(sock, { onError: message => console.error(message) });
      reconnectAttempt = 0;
      const storeUrl = process.env.STORE_URL || 'https://www.deepglobal.com.sg/shop';
      console.log(chalk.greenBright('\n🎉 DeepGmart Bot successfully connected to WhatsApp!'));
      console.log(chalk.cyan(`👤 Account: ${sock.user?.id || 'Unknown'}`));
      console.log(chalk.green(`🛒 Store: DeepGmart Singapore (${storeUrl})`));
      console.log(chalk.green('🌐 Public Store Mode: Active (all incoming messages will receive interactive menu).\n'));
    } else if (connection === 'close') {
      closed = true;
      stopPaymentMonitor();
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const delay = reconnectDelay(statusCode, reconnectAttempt++);
      sock.ev.removeAllListeners();
      activeSocket = null;
      try { sock.end(undefined); } catch {}
      if (delay === null) {
        if (statusCode === DisconnectReason.connectionReplaced) {
          console.error('WhatsApp replaced this connection (440). Check for another bot using the same linked session, including on another computer. Automatic reconnect stopped to prevent a conflict loop. Session files are preserved.');
        } else {
          console.error(`WhatsApp requires attention (${statusCode}). Automatic reconnect stopped. Session files are preserved; check Linked Devices before relinking.`);
        }
        process.exit(1);
      }
      scheduleReconnect(delay, statusCode);

    }
  });

  sock.ev.on('creds.update', () => saveCreds().catch(error => console.error('Unable to save WhatsApp credentials:', error.message)));

  sock.ev.on('messages.upsert', async m => {
    for (const msg of m.messages || []) {
      if (!msg || !msg.message) continue;

      // Save message to store for retry support
      if (msg.key?.id && msg.message) {
        storeMessage(msg.key.id, msg.message);
      }

      // Ignore protocol, sync, reaction, and key distribution messages
      if (
        msg.message.protocolMessage ||
        msg.message.senderKeyDistributionMessage ||
        msg.message.reactionMessage
      ) {
        continue;
      }

      // Ignore outgoing messages sent by the bot account (fromMe)
      if (msg.key.fromMe) continue;

      // Ignore bot's own sent messages to prevent reply loops
      if (botSentMessageIds.has(msg.key.id)) continue;

      const rawFrom = msg.key.remoteJid;
      if (!rawFrom || rawFrom === 'status@broadcast' || rawFrom.endsWith('@g.us')) continue;

      // Resolve LID to the user's real phone number JID
      const from = resolveLidToPn(rawFrom);

      const userText = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''
      ).trim();

      console.log(
        chalk.blueBright('💬 Incoming message from:'),
        from,
        rawFrom !== from ? chalk.gray(`(LID: ${rawFrom})`) : '',
        chalk.gray(userText ? `"${userText}"` : '')
      );

      try {
        await handler(sock, msg, from);
      } catch (err) {
        console.error(chalk.red('[Handler Error]'), err);
      }
    }
  });
  } catch (error) {
    stopPaymentMonitor();
    if (activeSocket) {
      activeSocket.ev.removeAllListeners();
      try { activeSocket.end(undefined); } catch {}
      activeSocket = null;
    }
    console.error('Unable to connect to WhatsApp:', error.message);
    scheduleReconnect(reconnectDelay(undefined, reconnectAttempt++), 'startup');
  } finally { starting = false; }
}

function scheduleReconnect(delay, reason) {
  if (shuttingDown || reconnectTimer) return;
  console.log(`Connection closed (${reason || 'network'}). Retrying in ${delay / 1000}s.`);
  reconnectTimer = setTimeout(() => { reconnectTimer = null; void startBot(); }, delay);
}

async function stopBot() {
  if (shuttingDown) return;
  shuttingDown = true;
  stopPaymentMonitor();
  clearTimeout(reconnectTimer);
  if (activeSocket) {
    activeSocket.ev.removeAllListeners();
    try { activeSocket.end(undefined); } catch {}
  }
  try { if (saveActiveCreds) await saveActiveCreds(); } catch {}
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stopBot(); });

try {
  await acquireSessionGuard(authDir, { replace: true, onReplace: stopBot });
  await startBot();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
