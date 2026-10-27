---
name: baileys-wiki
description: Official WhiskeySockets Baileys documentation, socket configuration, messaging APIs, LID/PN JID resolution, and multi-device connection best practices.
---

# Baileys WhatsApp Web API Reference & Best Practices

## Core Principles from Official Documentation (baileys.wiki)

### 1. Connection & Socket Configuration
- Always use `makeWASocket` with:
  - `auth`: Credentials and key store wrapped in `makeCacheableSignalKeyStore`.
  - `version`: Dynamically fetched with `fetchLatestWaWebVersion()` to prevent HTTP 405 Method Not Allowed errors.
  - `browser`: Use `Browsers.macOS('Desktop')` or `Browsers.windows('...')` for extended history and stable connection.
  - `logger`: Use `pino({ level: 'silent' })` for production.
  - `msgRetryCounterCache`: Use NodeCache instance.
  - `getMessage`: Provide message store lookup for retry support and E2EE synchronization.
- Never wipe or delete session keys in `session/` on startup. Signal Protocol relies on persistent ratchet keys (`authState.keys.set()`).

### 2. Standard Message Sending via `sock.sendMessage`
Every message must go through `sock.sendMessage(jid, content, options?)`:
- **Text message**: `await sock.sendMessage(jid, { text: 'Hello' })`
- **Quote reply**: `await sock.sendMessage(jid, { text: 'Hello' }, { quoted: msg })`
- **Image message**: `await sock.sendMessage(jid, { image: buffer, caption: '...' }, { quoted: msg })`
- **Mention**: `await sock.sendMessage(jid, { text: '@12345', mentions: ['12345@s.whatsapp.net'] })`
- **Polls**: `await sock.sendMessage(jid, { poll: { name: 'Options', values: ['A', 'B'], selectableCount: 1 } })`

### 3. JIDs and PN ↔ LID Duality (Baileys 7.x+)
- WhatsApp uses two JID types for every user:
  - **PNJID**: `[number]@s.whatsapp.net` (Phone Number JID)
  - **LIDJID**: `[lid]@lid` (Linked Identity JID - privacy identifier used by WhatsApp)
- Incoming messages from mobile devices often arrive with `msg.key.remoteJid` ending in `@lid`.
- When replying, always reply to `msg.key.remoteJid` directly with `sock.sendMessage`, or map the LID to its known phone number JID.

### 4. Interactive Messages & Native Flow Catalogues
- Modern WhatsApp interactive cards (bottom-sheet selection, action buttons, CTA links) use `proto.Message.InteractiveMessage` encapsulated inside `viewOnceMessage` with `deviceListMetadataVersion: 2`.
- See the dedicated skill: [.agents/skills/baileys-interactive-catalogue/SKILL.md](file:///c:/Projects/bot-store/.agents/skills/baileys-interactive-catalogue/SKILL.md) for full protocol schemas, media header preparation, and incoming button handler routing.
