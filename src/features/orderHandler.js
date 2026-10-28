// src/features/orderHandler.js
import { getProductBySlug, getProductImageBuffer, STORE_URL } from '../data/deepgmart.js'

export async function showProductDetail(sock, from, productId, quotedMsg = null) {
  const product = getProductBySlug(productId)
  if (!product) {
    await sock.sendMessage(from, { text: '❌ Product not found. Reply *menu* to see available products.' }, quotedMsg ? { quoted: quotedMsg } : {})
    return
  }

  const buffer = getProductImageBuffer(product.imageRelative)

  const caption = 
    `🛍️ *${product.title}*\n` +
    `${product.available ? '✅ In stock' : 'Currently out of stock'}\n` +
    `💰 Price: *${product.price} SGD*\n` +
    `📁 Category: *${(product.dept || 'Grocery').toUpperCase()}*\n\n` +
    `📝 ${product.desc}\n\n` +
    `👇 *Choose Add to cart to select quantity:*`

  const message = {
    footer: `© DeepGmart Singapore • ${STORE_URL}`,
    interactiveButtons: [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🛒 Add to cart',
          id: `add_${product.id}`,
        }),
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: '🌐 View in Web Shop',
          url: product.url,
        }),
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '📋 Back to Menu',
          id: 'menu',
        }),
      },
    ],
  }

  const options = quotedMsg ? { quoted: quotedMsg } : {}

  try {
    if (buffer) {
      await sock.sendMessage(from, {
        image: buffer,
        caption,
        ...message,
      }, options)
    } else {
      await sock.sendMessage(from, {
        text: caption,
        ...message,
      }, options)
    }
    console.log(`✅ Sent interactive product card (${product.title}) to:`, from)
  } catch (err) {
    console.error('[showProductDetail Error]', err)
  }
}