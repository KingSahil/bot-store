#!/usr/bin/env node
import { botConfig } from './src/config.js';
import { createNewMessageFilter } from './src/utils/newMessages.js';
import { isSenderAllowed } from './src/utils/allowedNumbers.js';
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

const authDir = botConfig.authDir;
const msgRetryCounterCache = new NodeCache();
const newMessages = createNewMessageFilter();

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

  const desc = `DeepGmart — ${botConfig.label}`;
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
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger: pino({ level: 'debug' }, {
      write(line) {
        const { msg } = JSON.parse(line);
        if (msg === '[handleMessage] Attempting retry request for failed decryption') {
          console.log('WhatsApp could not decrypt an incoming message and requested a resend.');
        } else if (msg === 'error in handling message') {
          console.log('WhatsApp reported an error while receiving a message.');
        }
      },
    }),
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

  sock.ws.prependListener('CB:message', (node) => {
    if (activeSocket !== sock || closed || shuttingDown) return;
    if (node.attrs?.offline) newMessages.recordQueuedFrame(node.attrs.id, Number(node.attrs.t));
    if (process.env.BOT_RECEIVE_DEBUG === 'true') {
      console.log(`WhatsApp delivered a message frame (${node.attrs?.offline ? 'offline queue' : 'live'}).`);
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(chalk.cyanBright('\n📷 Scan this QR code with WhatsApp:\n'));
      qrcode.generate(qr, { small: true });
      console.log(chalk.yellowBright('📱 Open WhatsApp → Settings (or ⋮) → Linked Devices → Link a Device\n'));
    }

    if (activeSocket !== sock || closed || shuttingDown) return;
    if (connection === 'open') {
      const connectedNumber = (sock.user?.id || '').split(':')[0].split('@')[0];
      if (botConfig.expectedNumber && connectedNumber !== botConfig.expectedNumber) {
        console.error(`Wrong WhatsApp account for ${botConfig.label}. Stop and pair the configured number using this instance's session directory.`);
        await stopBot();
        return;
      }
      stopPaymentMonitor();
      newMessages.connected();
      stopPaymentMonitor = startPaymentMonitor(sock, { onError: message => console.error(message) });
      reconnectAttempt = 0;
      const storeUrl = process.env.STORE_URL || 'https://www.deepglobal.com.sg/shop';
      console.log(chalk.greenBright(`\nDeepGmart — ${botConfig.label} connected to WhatsApp!`));
      console.log(chalk.cyan(`👤 Account: ${sock.user?.id || 'Unknown'}`));
      console.log(chalk.green(`🛒 Store: DeepGmart Singapore (${storeUrl})`));
      console.log(chalk.green(botConfig.allowedNumbers.length ? `Sender filter active: ${botConfig.allowedNumbers.length} allowed number(s).\n` : 'Sender filter: all numbers allowed.\n'));
    } else if (connection === 'close') {
      newMessages.disconnected();
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
    if (activeSocket !== sock || closed || shuttingDown) return;
    for (const msg of m.messages || []) {
      if (process.env.BOT_RECEIVE_DEBUG === 'true') {
        console.log(`WhatsApp message event (${m.type}, ${msg?.key?.fromMe ? 'own account' : 'incoming'}, ${msg?.message ? 'content present' : 'no readable content'}).`);
      }
      if (!newMessages.accepts(m.type, msg)) {
        if (m.type === 'notify' && /@(?:lid|s\.whatsapp\.net)$/.test(msg?.key?.remoteJid || '')) {
          console.log(msg.key.fromMe
            ? 'Skipped a message sent from the bot’s own account.'
            : 'Skipped an incoming WhatsApp event without fresh, readable message content.');
        }
        continue;
      }

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
      const phoneJid = rawFrom.endsWith('@lid') && msg.key.remoteJidAlt?.endsWith('@s.whatsapp.net') ? msg.key.remoteJidAlt : rawFrom;
      let from = resolveLidToPn(phoneJid);
      if (from?.endsWith('@lid')) {
        const mapped = await sock.signalRepository.lidMapping.getPNForLID(from).catch(() => null);
        if (mapped?.endsWith('@s.whatsapp.net')) from = jidNormalizedUser(mapped);
      }
      if (!isSenderAllowed(from, botConfig.allowedNumbers)) {
        console.log(from?.endsWith('@lid')
          ? 'Skipped a new message because WhatsApp did not provide a verifiable sender number.'
          : 'Skipped a new message from a number outside ALLOWED_NUMBERS.');
        continue;
      }
      if (activeSocket !== sock || closed || shuttingDown) return;

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
