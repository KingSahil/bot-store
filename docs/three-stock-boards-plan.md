# Three stock boards — implementation plan

Prepared: 2 November 2026

## Requested result

Create three distinct customer-facing stock boards on DeepGmart: **Pre-order stock**, **Wholesale stock**, and **Normal stock**. Treat a board as a dedicated shopping view, with matching stock-management views for the store administrator. Keep existing product departments as filters within each board.

This document completes the planning step. The boards are not implemented or deployed by this document.

## Website and source review

- Live `https://www.deepglobal.com.sg/shop` returned HTTP 200 during this review. Its rendered heading is “Shop Indian Essentials”, with “Browse Categories”. The requested three board labels were absent from the fetched shop HTML. This was an HTTP/content check, not a visual or checkout walkthrough.
- Website source: `C:/Projects/deepglobal`. `/shop` uses `src/app/shop/page.tsx`, `src/components/shop/ShopCatalogue.tsx`, and the server catalogue in `src/lib/catalogue.ts`.
- Product types and the base database schema currently provide availability/purchasability, department, price and variants; those reviewed definitions do not model board membership, wholesale minimums or pre-order timing.
- Admin product editing already exists in `src/components/admin/ProductFormPage.tsx` and `src/app/admin/actions.ts`.
- Website and bot checkout both have website-owned validation endpoints. Board eligibility and prices must be checked there, not trusted from a browser or WhatsApp message.
- Bot source: `C:/Projects/bot-store`. `src/data/deepgmart.js` reads the website's local `src/lib/data/products.json` snapshot. Updating the website database alone will not update this snapshot automatically.

## The three boards

| Board | Customer sees | Ordering behavior |
| --- | --- | --- |
| Pre-order stock | Product, price or confirmation requirement, expected arrival window, ordering cutoff where supplied, and a clear pre-order badge | Reserve an incoming item. Paid checkout is enabled only when price, capacity and fulfillment terms are configured; otherwise offer a clearly labelled confirmation request. Never imply immediate availability. |
| Wholesale stock | Product, pack/carton size, units per pack, pack price, minimum order and quantity increment | Order valid multiples of a pack at the configured wholesale price. Reject quantities below the minimum or outside the increment. Missing wholesale terms produce an enquiry action rather than retail checkout. |
| Normal stock | Existing retail products, prices, variants and current availability | Existing retail shopping behavior, with unavailable products prevented from checkout. |

Do not invent arrival dates, discounts, wholesale prices or product classifications. Existing products initially retain Normal stock membership. The other two boards can launch with honest empty states until the administrator assigns offers and their terms.

## Customer layout and navigation

1. Add three prominent entry cards to the shop and a compact board switcher above the catalogue, using the exact requested labels.
2. Give each board a shareable URL: `/shop?board=preorder`, `/shop?board=wholesale`, and `/shop?board=normal`. `/shop` opens Normal stock by default.
3. Scope search, category filters, sort, counts and pagination to the selected board. Changing a board resets pagination. Clearing filters keeps the selected board.
4. Show board-specific terms on product cards and product details. Carry the selected offer through product links, cart lines and checkout.
5. Use responsive cards and an accessible switcher with visible selection and keyboard support. Empty boards explain that products will be listed soon and provide the existing contact route.

## Data and stock rules

Use one canonical product with separate selling offers rather than duplicating the product and inventory. A product may have retail and wholesale offers simultaneously.

- Add a `product_offers` table with a stable offer ID, product/variant relation, board (`normal`, `preorder`, `wholesale`), enabled state and price in SGD cents.
- Store pack size, minimum packs and order increment for wholesale offers. Make the order quantity unit explicit: packs ordered, units per pack, and resulting total units.
- Store expected arrival window, optional cutoff, pre-order capacity and ordering terms for pre-order offers. Availability for a pre-order must use its configured incoming allocation rather than the current retail in-stock flag.
- Backfill normal offers using current product/variant prices and existing eligibility. Preserve existing product IDs and existing orders.
- Reserve retail and wholesale quantities against the same physical inventory where they share stock. Pre-order allocations use the incoming allocation pool. Do not infer numeric stock from the current boolean availability fields; inspect the active inventory integration and add the required persisted quantity/reservation support before promising capacity enforcement.
- Snapshot board, offer, unit/pack definition, price and pre-order terms on order items so later edits cannot rewrite an existing order's meaning.
- Preserve curated catalogue eligibility. Extend POS synchronization deliberately: normal prices and physical availability may refresh; manually configured wholesale and pre-order terms must survive sync. Alcohol remains eligible under the existing policy; excluded POS groups stay excluded.

## Admin boards

- Add three stock views with counts, search, category filtering and quick links to edit offers.
- Extend product editing with offer membership and the relevant board fields. Permit an existing product to be offered on more than one board.
- Validate required terms before enabling an offer. Show incomplete offers as drafts in admin and exclude them from paid checkout.
- Provide a controlled bulk assignment action with a selection preview. Do not automatically classify products from names or category guesses.
- Revalidate the catalogue after edits so board lists, counts and product details reflect changes together.

## Cart, checkout and orders

- Use offer ID in cart identity so retail and wholesale entries for the same product do not merge incorrectly.
- For the first release, keep each cart within one board. If a customer switches to a different board and tries adding an item, explain the separate fulfillment terms and require an explicit cart switch; never silently discard their cart. Browsing other boards remains available.
- Validate board, active offer, authoritative price, variant, quantity, pack multiple, cutoff and availability on the server for both website and bot checkout.
- Make reservations atomic, including contention between retail and wholesale. Release reservations after cancellation/expiry and keep payment retries idempotent. Define handling for late payment before enabling capacity-limited paid pre-orders.
- Keep payment status separate from fulfillment: a paid pre-order still awaits arrival. Display its board and expected fulfillment on confirmation and order history.
- Preserve existing normal-stock delivery rules. Wholesale and pre-order delivery fees/windows must be explicitly configured before accepting paid orders under those offers.
- Keep the existing payment environment unless separately configured. Creating boards does not establish live-money payment readiness.

## WhatsApp alignment

After the website board contract is stable, expose the same three choices in the bot menu. Scope categories/search to the chosen board and show pack/arrival terms in product and order summaries.

Replace or extend the local snapshot contract with a website-owned board/offer feed. If the snapshot remains temporarily, export offer IDs and terms in a versioned format, track its freshness, and keep checkout validation on the website. Website admin changes must reach the bot through an explicit refresh path. A stale or unrecognised offer must fail checkout with a useful message.

Keep current native mobile and readable Desktop/Web presentation behavior. This is an integration follow-up to the website boards, using the same authoritative rules.

## Implementation sequence

1. **Data contract and migration:** inspect active migrations/inventory; define offer IDs, quantity units, eligibility and reservation rules; backfill Normal stock; add migration and rollback notes.
2. **Admin management:** create and edit offers, show the three management views, validate drafts, and protect offer fields from POS sync.
3. **Customer boards:** add entry cards, switcher, board URLs, scoped catalogue filters, counts, product detail terms and empty states.
4. **Ordering:** update carts, server pricing, reservations, website/bot checkout, payment retries and order snapshots. Handle existing carts as legacy normal offers and reject stale prices through current validation.
5. **Bot alignment:** add board menus and a refreshed shared offer feed without creating separate pricing rules.
6. **Verification and rollout:** run catalogue/checkout tests and build; review responsive UI; test all three board journeys with test payments; deploy migration before code that requires it; verify production board routes and admin saves.

## Acceptance checks

- Exactly three named boards are visible and directly shareable; changing board filters the full catalogue before pagination and counting.
- Existing retail products remain available through Normal stock. Empty boards do not contain fabricated products or terms.
- An admin can configure, enable, disable and reassign offers; one canonical product can sell through retail and wholesale without duplicating physical stock.
- Wholesale minimums, pack quantities and authoritative prices are enforced on both checkout endpoints, including tampered requests.
- Pre-orders clearly disclose timing/terms and enforce cutoff/allocation independently of on-hand stock.
- Concurrent orders cannot oversell configured allocations; expiry, cancellation, retries and delayed payments have tested outcomes.
- Existing orders remain readable and existing pending payment links remain verifiable.
- Normal-stock delivery behavior remains correct; other board delivery terms are shown before payment.
- Website and bot show matching offer definitions; stale bot data cannot authorise a wrong-price or wrong-board order.
- Mobile, desktop, keyboard navigation, empty states, filtering, direct links, admin edits and test payment confirmation are checked.

## Completion definition

Planning is complete with this document. Implementation is complete only when the three customer boards, their admin controls, shared checkout enforcement and verification above are delivered. Deployment and live device evidence must be reported separately from local tests.
