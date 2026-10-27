---
name: baileys-interactive-catalogue
description: WhatsApp Native Flow Interactive Catalogue, single_select popup list sheets, action buttons, viewOnceMessage envelope encapsulation, and response routing for Baileys.
---

# WhatsApp Native Flow Interactive Catalogue with Baileys

This guide documents the architecture, protobuf structures, and best practices for sending rich, interactive card catalogues with WhatsApp Native Flow buttons (bottom-sheet item selection, action buttons, external web links, and media headers) using Baileys.

---

## 1. Core Architecture

WhatsApp clients (Android, iOS, Web) render rich interactive interfaces through **Native Flow Messages** (`proto.Message.InteractiveMessage`). Unlike plain text numbers, native flow components render as true UI widgets:

1. **`single_select`**: A tappable button (e.g., `📋 Browse Groceries Catalogue`) that pops open a native WhatsApp bottom sheet containing categorized sections and selectable rows with titles, descriptions, and IDs.
2. **`quick_reply`**: Native tappable pill buttons (e.g., `🛒 Buy / Order Now`, `📋 Back to Menu`) that send an instant callback ID to the bot.
3. **`cta_url`**: In-app browser link button (e.g., `🌐 View in Web Shop`).
4. **`cta_copy`**: One-tap copy button for voucher codes, bank account numbers, or crypto addresses.

---

## 2. The `viewOnceMessage` Envelope Pattern

### Why the Envelope Is Required
On WhatsApp mobile clients (2024–2026+), Meta introduced security restrictions for incoming `interactiveMessage` packets:
- If a raw `interactiveMessage` is received from a non-enterprise / non-official business account, official WhatsApp clients often hide the buttons or display `"Waiting for this message"`.
- Wrapping the `interactiveMessage` inside a `viewOnceMessage` with `deviceListMetadataVersion: 2` bypasses this filter on both Android and iOS, rendering the full interactive native flow buttons and card catalogue seamlessly.

### Protobuf Structure
```javascript
import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys'

const messagePayload = {
  viewOnceMessage: {
    message: {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
      },
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        header: {
          title: 'Store Name',
          hasMediaAttachment: !!media?.imageMessage,
          ...(media?.imageMessage ? { imageMessage: media.imageMessage } : {}),
        },
        body: { text: 'Welcome! Choose an item below:' },
        footer: { text: '© Store Name • Tagline' },
        nativeFlowMessage: {
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: '📋 Browse Catalogue',
                sections: [
                  {
                    title: 'Category 1',
                    rows: [
                      { id: 'prod_1', title: 'Product 1', description: 'S$2.50 • Description' },
                      { id: 'prod_2', title: 'Product 2', description: 'S$3.00 • Description' },
                    ],
                  },
                ],
              }),
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: '🌐 Visit Web Shop',
                url: 'https://example.com/shop',
              }),
            },
          ],
        },
      }),
    },
  },
}
```

---

## 3. Media Preparation

When attaching an image header (such as a store banner or product photo):

```javascript
import { prepareWAMessageMedia } from '@whiskeysockets/baileys'

// buffer must be a Node.js Buffer
const media = await prepareWAMessageMedia(
  { image: buffer },
  { upload: sock.waUploadToServer }
)

const header = {
  title: 'Header Title',
  hasMediaAttachment: true,
  imageMessage: media.imageMessage,
}
```

---

## 4. Transmission via `sock.relayMessage`

Because standard `@whiskeysockets/baileys` `sock.sendMessage` does not natively parse custom `interactiveButtons`, use `generateWAMessageFromContent` + `sock.relayMessage`:

```javascript
const msg = generateWAMessageFromContent(targetJid, messagePayload, {
  userJid: sock.user?.id,
  quoted: options?.quoted,
})

await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id })

// Always record sent message IDs to prevent feedback loops and support retries:
botSentMessageIds.add(msg.key.id)
storeMessage(msg.key.id, msg.message)
```

### Global Transparent Socket Interceptor
To make `sock.sendMessage` throughout the entire codebase automatically support `interactiveButtons` without refactoring every call, wrap `sock.sendMessage` in `src/utils/typing.js`:

```javascript
export function wrapSendMessageGlobally(sock) {
  const originalSendMessage = sock.sendMessage.bind(sock)

  sock.sendMessage = async (jid, content, options = {}) => {
    const targetJid = jidNormalizedUser(jid)

    const hasInteractive = Array.isArray(content?.interactiveButtons) && content.interactiveButtons.length > 0
    const hasButtons = Array.isArray(content?.buttons) && content.buttons.length > 0

    if (hasInteractive || hasButtons) {
      // Build native flow envelope with viewOnceMessage and call relayMessage
      // Fallback gracefully to originalSendMessage if any error occurs
    }

    return originalSendMessage(targetJid, content, options)
  }
}
```

---

## 5. Decoding User Responses (`src/handler.js`)

When a user taps an item in the catalogue or clicks an action button, WhatsApp transmits the selected ID via one of the following message properties:

```javascript
let rowId = null

// 1. Native Flow response (Android / iOS)
if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
  const parsed = JSON.parse(
    msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
  )
  rowId = parsed.id
}
// 2. Single select reply fallback
else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
  rowId = msg.message.listResponseMessage.singleSelectReply.selectedRowId
}

// 3. Button click fallback
const btnId = 
  msg.message?.buttonsResponseMessage?.selectedButtonId ||
  msg.message?.templateButtonReplyMessage?.selectedId ||
  rowId
```

### Routing Conventions
- `rowId.startsWith('dept_')` ➔ Open department specific list
- `rowId.startsWith('prod_')` ➔ Display product detail card with image & Buy Now button
- `btnId === 'buy_now'` ➔ Display payment methods menu
- `rowId.startsWith('pay_')` ➔ Send payment details & request receipt/address
- `btnId === 'menu'` ➔ Return to main catalogue menu

---

## 6. JID & LID Routing Rules

- Incoming WhatsApp messages often arrive with `remoteJid` ending in `@lid` (Linked Identity).
- Always normalize target JIDs with `jidNormalizedUser(jid)` to strip device suffixes (`:1@s.whatsapp.net` ➔ `@s.whatsapp.net`).
- If sending to self, ensure the target is your phone number JID (`9189685xxxx9@s.whatsapp.net`), not an unregistered LID, to prevent silent drops.
