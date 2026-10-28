<p align="center">
  <img src="src/assets/wa-title.png" alt="WhatsApp Bot Store" width="400"/>
</p>

<p align="center">
  <!-- 🔹 Project Info -->
  <a href="https://www.npmjs.com/package/atexovi-baileys" target="_blank">
    <img src="https://img.shields.io/npm/v/atexovi-baileys?style=flat&logo=npm&logoColor=white&labelColor=CB3837&color=white" alt="npm version">
  </a>
  <a href="https://nodejs.org/en/" target="_blank">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js version">
  </a>
  <a href="https://github.com/atex-ovi/bot-store/blob/main/LICENSE" target="_blank">
    <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat&logo=balance-scale&logoColor=black" alt="License MIT">
  </a>
</p>

<p align="center">
  <!-- 🔹 GitHub Stats -->
  <a href="https://github.com/atex-ovi" target="_blank">
    <img src="https://img.shields.io/badge/My Profile-181717?style=flat&logo=github&logoColor=white" alt="My Profile">
  </a>
  <a href="https://github.com/atex-ovi/bot-store/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/atex-ovi/bot-store?style=flat&label=Stars&color=white&labelColor=181717&logo=github" alt="GitHub Stars">
  </a>
  <a href="https://github.com/atex-ovi/bot-store/network/members" target="_blank">
    <img src="https://img.shields.io/github/forks/atex-ovi/bot-store?style=flat&label=Forks&color=white&labelColor=181717&logo=github" alt="GitHub Forks">
  </a>
  <a href="https://github.com/atex-ovi/bot-store/commits/main" target="_blank">
    <img src="https://img.shields.io/github/last-commit/atex-ovi/bot-store?style=flat&label=Last%20Commit&color=white&labelColor=181717&logo=git" alt="Last Commit">
  </a>
</p>

<p align="center">
  <!-- 🔹 Contact -->
  <a href="https://t.me/atexovi" target="_blank">
    <img src="https://img.shields.io/badge/Telegram-29A9EB?style=flat&logo=telegram&logoColor=white" alt="Telegram">
  </a>
  <a href="https://facebook.com/atex.ovi" target="_blank">
    <img src="https://img.shields.io/badge/Facebook-1877F2?style=flat&logo=facebook&logoColor=white" alt="Facebook">
  </a>
  <a href="https://whatsapp.com/channel/0029VbCMQ6x30LKO5q0GaC0n" target="_blank">
    <img src="https://img.shields.io/badge/WhatsApp-25D366?style=flat&logo=whatsapp&logoColor=white" alt="WhatsApp">
  </a>
</p>

<br>

<p align="center">
  <strong style="font-size:24px;">
    An interactive WhatsApp store bot template.  
    Manage products, receive orders, and accept payments with interactive buttons.
  </strong>
</p>

## Features

* Interactive product menus with multiple options
* Order handling & receipt upload
* Multiple payment methods (OVO, DANA, GoPay, ShopeePay)
* Automatic notifications to admin
* Quick reply and CTA buttons
* State management for users during the ordering process
* Easily customizable product catalog

<br><br>

## Demo Screenshots

<table>
<tr>
<td><img src="https://raw.githubusercontent.com/atex-ovi/bot-store/main/src/assets/demo1.jpg" width="150"></td>
<td><img src="https://raw.githubusercontent.com/atex-ovi/bot-store/main/src/assets/demo2.jpg" width="150"></td>
<td><img src="https://raw.githubusercontent.com/atex-ovi/bot-store/main/src/assets/demo3.jpg" width="150"></td>
</tr>
<tr>
<td><img src="https://raw.githubusercontent.com/atex-ovi/bot-store/main/src/assets/demo4.jpg" width="150"></td>
<td><img src="https://raw.githubusercontent.com/atex-ovi/bot-store/main/src/assets/demo5.jpg" width="150"></td>
<td><img src="https://raw.githubusercontent.com/atex-ovi/bot-store/main/src/assets/demo6.jpg" width="150"></td>
</tr>
</table>

<br><br>

## Quick Start

- **Termux Android**
```bash
pkg update && pkg upgrade
pkg install nodejs git
git clone git@github.com:atex-ovi/bot-store.git
cd bot-store
npm install
cp .env.example .env
nano .env  # edit ADMIN_JID and payment info
npm start

```
- **Windows / Linux**
```bash
git clone git@github.com:atex-ovi/bot-store.git
cd bot-store
npm install
cp .env.example .env   # Windows: copy .env.example .env
nano .env               # edit ADMIN_JID and payment info
npm start

```
> [!TIP]
> After `npm start`, follow the pairing code in the terminal to connect WhatsApp.

## Directory Structure
```
bot-store/
├── README.md
├── .env.example
├── .gitignore
├── index.js
├── package.json
└── src
    ├── assets
    │   ├── e-wallet.jpg
    │   ├── tempe-original.jpg
    │   ├── tempe-balado.jpg
    │   └── tempe-pedas.jpg
    ├── data
    │   ├── orders.json
    │   └── userState.js
    ├── features
    │   ├── orderHandler.js
    │   ├── paymentMenu.js
    │   ├── sendToAdmin.js
    │   ├── storeMenu.js
    │   └── uploadReceipt.js
    ├── handler.js
    └── utils
        ├── orderResponse.js
        ├── typing.js
        └── utils_order.js
```

## Environment Variables
> [!TIP]
> Rename `.env.example` to `.env` to enable the **Pay Now** button, then update the file with your own information:

```env
# Admin WhatsApp JID
ADMIN_JID=62xxxxxxxxxxx@s.whatsapp.net

# Payment account numbers
PAY_OVO=08xxxxxxxxxx
PAY_SHOPEEPAY=08xxxxxxxxxx
PAY_DANA=08xxxxxxxxxx
PAY_GOPAY=08xxxxxxxxxx

# Optional payment URLs (replace with your own links)
PAY_OVO_URL=https://ovo.id/payment/abcdef12345
PAY_SHOPEEPAY_URL=https://shopeepay.link/abcdef12345
PAY_DANA_URL=https://link.dana.id/minta/qr/123456abcdef
PAY_GOPAY_URL=https://gopay.link/u/abcdef12345

# Recipient / account holder name
PAY_RECIPIENT_NAME=Atex Ovi
```

> [!IMPORTANT]
> Do not commit `.env` to public repository.

> [!NOTE]
> - All product titles are placeholders; customize as needed.
> - Upload receipts images and include address to speed up order processing.
> - Admin will automatically receive notifications for new orders.
> - Supports multiple payment methods with CTA buttons.

<br><br>

## Disclaimer
> [!CAUTION]
> WhatsApp Bot Store is an **experimental/template project** for managing products, orders, and payments via WhatsApp with interactive buttons.
> This bot is **unofficial and not affiliated with WhatsApp Inc.** Use responsibly.  
All usage is at your own risk; avoid spam or any activity that violates WhatsApp's terms of service.

<br><br>

## Special Thanks
- [WhatsApp API](https://www.whatsapp.com) - WhatsApp's official messaging technology.
- [adiwajshing](https://github.com/adiwajshing) - Baileys library developer for WhatsApp API.
- [WhiskeySockets Baileys](https://github.com/WhiskeySockets) - additional contributions to Baileys.

<br><br>

## Support & Donations
If you find this project useful, consider supporting the development:

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/atexovi)

<br><br>


## License

This project is licensed under the [MIT License](LICENSE.md).


## Category shopping and checkout

The bot reads purchasable products from `PRODUCTS_JSON_PATH` (by default the Deepglobal product file beneath `DEEPGLOBAL_PATH`). It refreshes the file for each catalogue request and fails closed if it cannot read it. Categories and search results are paginated, with numbered replies available as a text fallback. Out-of-stock products can be browsed but cannot be added. Multiple variants require a variant selection.

Commands: `menu`, `search rice`, `cart`, `qty 3`, `remove 1`, `clear cart`, `checkout`, `cancel`, and `status`. Product cards have Add to cart buttons. Prices and availability are checked again at checkout and payment creation.

Customer carts, delivery addresses, and order history are saved atomically to `BOT_STATE_PATH`, default `src/data/shop-state.json`. Keep this file private, back it up, and run only one bot process per state file. This is local file storage, not a multi-instance database. A malformed state file stops startup rather than discarding saved orders.

By default delivery matches the website: S$5 below S$50 and free from S$50. An optional nonblank `DELIVERY_FEE_CENTS` overrides this with a flat fee (`0` means free). Blank or missing uses the website rule; invalid values block checkout. Enable `ENABLE_COD=true` only if the store offers cash on delivery. Configure the real `ADMIN_JID` to receive confirmed orders. Review catalogue freshness and eligible product categories before operating the bot publicly.

When online payment and COD are disabled, an admin-configured store can receive an unpaid order request through Request confirmation. The customer is told the store must confirm availability and payment instructions.

For online payment set `STRIPE_SECRET_KEY`, initially a test key. The bot creates an order-specific Stripe-hosted Checkout session using server-selected product prices, quantities, and the configured delivery fee. It stores the session and reuses it on retry. Customers tap Check payment or send `status`; the bot checks Stripe and confirms only a paid session with matching order reference, metadata, currency, and amount. No payment screenshot marks an order paid. Payment confirmation is customer-triggered; automatic webhook notifications and native WhatsApp Business Platform payments are not included. The website checkout endpoint is not called or modified.

Before enabling real payments, run the bot with test credentials and verify the complete flow from a phone, including successful, cancelled, and delayed payments. The local JSON snapshot cannot prove live POS stock; use a regularly refreshed export or shared inventory API for live operation. Confirmed orders are retained in the private state file; admin delivery failures do not erase them.

Run `npm test` for the local shopping-flow and mocked Stripe verification tests. These checks do not send WhatsApp messages or charge cards.


### Restarting the bot

Run `npm start` again to replace the running bot from this same session folder. The new process requests shutdown over a local-only session guard, waits for the previous process to exit, and then connects. Login files and carts are preserved. This applies once the running process has the session guard; an older version needs to be stopped once before starting the updated version. Copies running on another computer or using a different session directory must be stopped separately.

A 440 connection-replaced error stops automatic reconnect to avoid fighting another client. Temporary network failures retry with increasing delays up to 60 seconds; pairing restarts reconnect promptly. Session files are not automatically deleted on disconnect.


### Guided delivery details

Checkout collects full name, street/unit address, and six-digit Singapore postal code separately. Each step has Cancel and (after name) Back buttons. The final details card has Confirm details and Edit details buttons; customers can also type `edit name`, `edit address`, or `edit postal`. Details are validated before order review and stored as structured `shipping` data alongside the readable address. Postal codes remain strings to preserve leading zeros. This is an interactive conversation, not a native pop-up WhatsApp Flow.


### WhatsApp Desktop compatibility

By default each menu sends one native interactive card. If sending the card fails, the bot sends a readable fallback instead. Some Desktop/Web clients reject the native-flow/view-once envelope; those chats can use text-only mode. Send `desktop` to save a text-only preference for this customer chat, suppressing native cards. Send `mobile` to restore a single message with native buttons. Numbered menus, `add`, `cart`, `checkout`, delivery prompts, `confirm details`, `pay online`, `cash on delivery`, and `request confirmation` remain available without tapping buttons. Native desktop rendering depends on the receiving WhatsApp client and has not been verified by local transport tests.


### Shopping while a payment is pending

Pending Stripe sessions do not block adding products or starting another checkout. The cart stays available while payment is pending. Starting a new order preserves the previous order and its payment session in history. My orders lists current and earlier orders with order-specific payment checks. A paid historical order never clears a newer cart or marks a newer order paid. Existing Stripe links keep their original amounts; adding products requires a new order/payment link for the changed basket. Edit cart opens an interactive removal menu. Desktop text-only preferences remain available through `desktop`; use `mobile` for a single native interactive message.


### Automatic device presentation

By default each incoming message is classified using Baileys `getDevice(message.key.id)`: predicted Desktop/Web gets one readable message; predicted Android/iOS gets one native card. This is a message-ID heuristic, not verified device metadata or a client capability check. Unknown IDs preserve the last mode. `desktop` and `mobile` set a persistent manual override, while `auto` restores prediction. The latest sending device guides presentation; the bot cannot know which linked device will subsequently display the reply.


### Shared DeepGmart checkout

New online orders use the website's `/api/bot/checkout` endpoint and order database. Set `BOT_CHECKOUT_URL` to the website origin and set the same private `BOT_CHECKOUT_SECRET` (32+ random characters) in both services. Locally the website must run on `http://localhost:3000`. Deploy the website before targeting production from the bot, then restart the bot. Details: `C:/Projects/deepglobal/docs/whatsapp-checkout.md`.

Payment confirmation is checked automatically while WhatsApp is connected, including pending orders restored on restart. Check payment remains a fallback. Expired shared payment links can be renewed from My orders. Existing Stripe links remain verifiable using the legacy Stripe key. New payments are never authorized from a receipt screenshot or customer message.

Delivery address saving is optional: use Save for next time at confirmation, then Use saved address on a later checkout. Reply `forget address` to remove the reusable address. Existing order delivery records remain available for fulfilment.
