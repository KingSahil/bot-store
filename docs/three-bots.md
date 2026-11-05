# Three WhatsApp bots

The same code runs three independent processes: Normal stock, Pre-order stock and Wholesale stock. Each process pairs to one WhatsApp account. You need three distinct registered numbers and must scan each QR code with the corresponding account.

## Start

Run these commands in three separate terminals from `C:/Projects/bot-store`:

```powershell
npm run start:normal
npm run start:preorder
npm run start:wholesale
```

Copy each `config/<mode>.env.example` to `config/<mode>.env` if it does not already exist. Set `BOT_PHONE_NUMBER` to that account's international number, digits only. After pairing, the bot checks that the connected number matches. A wrong account stops before processing messages or starting payment monitoring. An empty number allows initial pairing without that check.

Shared settings/credentials come from `.env`; each profile can override `ADMIN_JID`, `PRODUCTS_JSON_PATH` and other store settings. The named launchers always force distinct `runtime/<mode>/session` and `runtime/<mode>/shop-state.json` paths. Do not share or commit runtime directories: they contain WhatsApp credentials and customer data.

Restarting a named instance replaces only the process for its session directory. Plain `npm start` retains the original `session/` and `src/data/shop-state.json` paths for compatibility. Stop the old retail process before pairing the same number to `start:normal`; existing legacy carts are not automatically migrated.

## Restrict customer numbers

Set `ALLOWED_NUMBERS` in the matching `config/<mode>.env`. Leave it blank to accept everyone, or use comma-separated international sender numbers:

```dotenv
ALLOWED_NUMBERS=919876543210,6581234567
```

A leading `+` and phone formatting spaces are accepted; digits-only numbers are recommended. This setting lists customer/sender numbers, while `BOT_PHONE_NUMBER` identifies the bot's own account. Restart the instance after editing. Other senders receive no reply and their messages do not reach the shopping handler. Invalid nonblank lists stop startup. Under restrictions, unidentified WhatsApp LIDs are skipped until their phone identity can be resolved; no admin-number assumption is used. An explicit blank value in a bot profile overrides a shared `.env` restriction. Group messages remain ignored.

## Catalogue contract

By default all bots read the configured shared product snapshot. Unclassified products belong only to Normal stock. Explicit `stock_board` values are `normal`, `preorder` and `wholesale`. Filtering applies to categories, search, direct product IDs, add-to-cart and order repricing. An unknown board is excluded from all bots. A dedicated JSON file must still classify its products correctly.

Wholesale example (quantity is packs; price is per pack in SGD cents):

```json
{
  "id": "wholesale-rice", "slug": "wholesale-rice", "title": "Rice carton",
  "dept": "pantry", "stock_board": "wholesale",
  "price": 1800, "in_stock": true, "purchasable": true,
  "wholesale": { "pack_units": 12, "min_packs": 3, "increment": 2, "price_cents": 1800 }
}
```

This offer accepts 3, 5, 7… packs up to the existing 99 quantity limit. Cart accumulation must also meet those rules.

Pre-order example:

```json
{
  "id": "incoming-rice", "slug": "incoming-rice", "title": "Incoming rice",
  "dept": "pantry", "stock_board": "preorder",
  "price": 250, "in_stock": false, "purchasable": true,
  "preorder": {
    "arrival": "Use the actual supplier-confirmed window",
    "terms": "Store confirms allocation and delivery before payment.",
    "accepting_orders": true
  }
}
```

An optional `preorder.cutoff` is an ISO timestamp with timezone. Expired or invalid cutoffs exclude the offer. Incomplete special-board terms and special products with variants are excluded. These examples are documentation only; no products, prices or supplier dates have been added to the live catalogue.

## Orders and payments

Normal stock retains existing shared website checkout and optional COD. Pre-order and Wholesale currently accept unpaid **Request confirmation** orders only, requiring `ADMIN_JID`. Online/COD actions are blocked even if a customer sends a forged button reply. The administrator receives the board, price, quantity and terms; the order retains its board and terms snapshot. Delivery totals for these requests are estimates using the existing delivery configuration; the store confirms the final delivery charge before payment.

The website does not yet have the planned board/offer backend. Special-board requests do not reserve inventory or establish guaranteed allocations. Automatic special-board payments require the website offer model, authoritative pricing, delivery rules and reservations described in `three-stock-boards-plan.md`. Retail payment status monitoring continues normally. Product cards link to the existing website product page; special-board ordering is handled in WhatsApp, not by the website product page.

## Operations

All modes ignore chat-history sync and messages sent before the current WhatsApp connection opened. Only new `notify` events with current timestamps reach the bot handler; repeated message IDs are ignored. Reconnecting resets the cutoff, so messages sent while the bot was offline are skipped too. This does not delete WhatsApp chats or saved carts/orders. Existing payment monitoring remains active for pending orders.

For continuous service, run each command under your host's process supervisor with persistent disk for `runtime/` and secure backups. Pair in a visible terminal first. Do not run two hosts against the same account/session. Each instance must have a different WhatsApp number; directory isolation cannot make a single number into three accounts.

`npm test` covers existing shopping behavior plus isolated configurations, board filtering, invalid quantity rejection and special-board payment blocking. Local tests do not pair accounts or send real messages. Real-device acceptance needs all three phone accounts, sample approved products, admin delivery and a normal-stock test payment.
