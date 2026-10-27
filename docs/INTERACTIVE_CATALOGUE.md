# Interactive WhatsApp Card Catalogue Documentation

## Overview

This repository powers an interactive WhatsApp e-commerce store with rich UI components:
- **Card Catalogue Popup (`single_select`)**: Customers tap a button to open a native WhatsApp bottom sheet with categorized grocery sections (Snacks, Staples, Spices, Beverages, Essentials) and selectable products.
- **Product Detail Cards**: Displays authentic product photos from DeepGmart Singapore (`C:\projects\deepglobal`), formatted pricing in SGD (`S$`), descriptions, and interactive action buttons.
- **Quick Reply Buttons (`quick_reply`)**: One-tap action buttons such as `🛒 Buy / Order Now` and `📋 Back to Menu`.
- **In-App Web Shop CTA (`cta_url`)**: Direct links opening `https://www.deepglobal.com.sg/shop` or specific product pages inside WhatsApp.
- **Payment Selection Bottom-Sheet**: Interactive payment options including PayNow (SGQR / UEN), DBS PayLah!, Credit/Debit Card online checkout, and Cash on Delivery.

---

## Architecture & Protocol Details

### 1. The `viewOnceMessage` Envelope Pattern
Standard WhatsApp personal and non-enterprise business accounts are restricted by Meta from sending raw `interactiveMessage` packets to official mobile clients.
To ensure the buttons and catalogue always render on WhatsApp Android and iOS without being hidden or dropped:

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
          title: 'DeepGmart Groceries',
          hasMediaAttachment: !!media?.imageMessage,
          ...(media?.imageMessage ? { imageMessage: media.imageMessage } : {}),
        },
        body: { text: welcomeCaption },
        footer: { text: '© DeepGmart Singapore • https://www.deepglobal.com.sg/shop' },
        nativeFlowMessage: {
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: '📋 Browse Groceries Catalogue',
                sections: catalogueSections,
              }),
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: '🌐 Visit Web Shop',
                url: 'https://www.deepglobal.com.sg/shop',
              }),
            },
          ],
        },
      }),
    },
  },
}
```

### 2. Global Transmission Interceptor (`src/utils/typing.js`)
Instead of duplicating protobuf assembly across multiple features, `wrapSendMessageGlobally(sock)` intercepts calls to `sock.sendMessage()` containing:
- `interactiveButtons: [...]`
- `buttons: [...]`
- Media buffers (`image`, `video`)

It automatically uploads media to WhatsApp servers (`sock.waUploadToServer`), wraps the payload in the `viewOnceMessage` envelope, relays the stanza via `sock.relayMessage()`, and caches message IDs for retry reconciliation.

---

## File Structure

- **`index.js`**: Bot startup, dynamic WhatsApp Web version fetching via `fetchLatestWaWebVersion()`, connection event management, and message routing.
- **`src/handler.js`**: Core conversation router that decodes `interactiveResponseMessage`, `listResponseMessage`, `buttonsResponseMessage`, keywords, and receipt uploads.
- **`src/features/storeMenu.js`**: Builds and sends the interactive DeepGmart catalogue card with `single_select` and web shop CTA.
- **`src/features/orderHandler.js`**: Displays product image, price, description, and interactive `🛒 Buy / Order Now` + `🌐 View in Web Shop` buttons.
- **`src/features/paymentMenu.js`**: Sends the interactive payment method selector and digital payment instructions.
- **`src/data/deepgmart.js`**: Integrates 2,500+ products and images from `C:\projects\deepglobal`.
- **`src/utils/resolveLid.js`**: Resolves privacy-masked WhatsApp LIDs (`@lid`) to real phone numbers (`@s.whatsapp.net`).
- **`.agents/skills/baileys-interactive-catalogue/SKILL.md`**: Specialized agent skill instructions for Baileys interactive messages.

---

## How to Test

1. Ensure the bot is running (`npm start`).
2. Send `menu` or `hi` to the bot from your phone.
3. You will receive the **DeepGmart Singapore** card with banner image and the `📋 Browse Groceries Catalogue` button.
4. Tap the button to open the bottom sheet with all departments and products.
5. Tap any product to view its product card and tap `🛒 Buy / Order Now` to proceed to checkout!
