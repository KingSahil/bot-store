// src/features/paymentMenu.js
import { userState } from '../data/userState.js'
import dotenv from 'dotenv'
import { getProductBySlug, getBannerBuffer, STORE_URL } from '../data/deepgmart.js'

dotenv.config()

const ACC = {
  PAYNOW: process.env.PAY_PAYNOW || 'UEN: 202100000X (DeepGmart Pte Ltd) or +65 8171 0548',
  PAYLAH: process.env.PAY_PAYLAH || '+65 8171 0548 (DBS PayLah!)',
  CARD: `Pay online via Credit/Debit Card at ${STORE_URL}`,
  COD: process.env.PAY_COD || 'Cash on Delivery (Available across Singapore)',
}

const CTA_URLS = {
  CARD: process.env.PAY_CARD_URL || STORE_URL,
  PAYNOW: process.env.PAY_PAYNOW_URL || null,
}

export async function showPaymentMenu(sock, from, productId, quotedMsg = null) {
  const product = productId ? getProductBySlug(productId) : null
  const productLine = product
    ? `Selected Item: *${product.title}* (${product.price})\n\n`
    : ''

  const listPayload = {
    title: 'Payment Methods',
    sections: [
      {
        title: 'Available Payment Options:',
        rows: [
          { id: 'pay_paynow', title: 'PayNow (SGQR / UEN)', description: 'Scan QR or UEN: 202100000X' },
          { id: 'pay_paylah', title: 'DBS PayLah!', description: 'Transfer to +65 8171 0548' },
          { id: 'pay_card', title: 'Credit / Debit Card', description: 'Online checkout at DeepGmart web shop' },
          { id: 'pay_cod', title: 'Cash on Delivery (COD)', description: 'Pay upon delivery across Singapore' },
        ],
      },
    ],
  }

  const captionText = 
    `💳 *DEEPGMART PAYMENT METHODS* 🇸🇬\n\n` +
    productLine +
    `Please tap the button below to select your payment method:`

  const message = {
    footer: '© DeepGmart Singapore • Secure Checkout',
    interactiveButtons: [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: '💳 Choose Payment Method',
          sections: listPayload.sections,
        }),
      },
    ],
  }

  const buffer = getBannerBuffer()
  const options = quotedMsg ? { quoted: quotedMsg } : {}

  try {
    if (buffer) {
      await sock.sendMessage(from, {
        image: buffer,
        caption: captionText,
        ...message,
      }, options)
    } else {
      await sock.sendMessage(from, {
        text: captionText,
        ...message,
      }, options)
    }
    console.log('✅ Sent interactive DeepGmart payment menu to:', from)
  } catch (err) {
    console.error('[showPaymentMenu Error]', err)
  }

  // Save user state
  const state = userState.get(from) || {}
  if (productId) state.product = productId
  userState.set(from, state)
}

export async function handlePayment(sock, from, payId, quotedMsg = null) {
  const method = payId.replace('pay_', '').toUpperCase()
  const account = ACC[method] || ACC.PAYNOW
  const url = CTA_URLS[method] || null

  const state = userState.get(from) || {}
  state.paymentMethod = method
  state.step = 'waiting_receipt'
  userState.set(from, state)

  const recipientName = process.env.PAY_RECIPIENT_NAME || 'DeepGmart Singapore'

  const text = 
    `💳 *PAYMENT INSTRUCTIONS — ${method}*\n\n` +
    `📌 *Payment Details:* ${account}\n` +
    `👤 *Recipient:* ${recipientName}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*Next Steps to Complete Your Order:*\n` +
    `1. Send a *photo/screenshot of your payment receipt* here.\n` +
    `2. Include your *Singapore delivery address & postal code* in the message.`

  const interactiveButtons = []
  if (url) {
    interactiveButtons.push({
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '🌐 Pay Online Now',
        url,
      }),
    })
  }
  interactiveButtons.push({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: '📋 Back to Store Menu',
      id: 'menu',
    }),
  })

  const message = {
    footer: `© DeepGmart Singapore • ${STORE_URL}`,
    interactiveButtons,
  }

  const options = quotedMsg ? { quoted: quotedMsg } : {}

  try {
    await sock.sendMessage(from, {
      text,
      ...message,
    }, options)
    console.log(`✅ Sent interactive payment instructions (${method}) to:`, from)
  } catch (err) {
    console.error('[handlePayment Error]', err)
  }
}