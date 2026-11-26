// src/features/orderHandler.js
import { getProductBySlug, getProductImageBuffer, STORE_URL } from '../data/deepgmart.js'
import { wholesaleContact } from './storeMenu.js'

export async function showProductDetail(sock, from, productId, quotedMsg = null) {
  const product = getProductBySlug(productId)
  if (!product) {
    await sock.sendMessage(from, { text: '❌ Product not found. Reply *menu* to see available products.' }, quotedMsg ? { quoted: quotedMsg } : {})
    return
  }

  const buffer = await getProductImageBuffer(product.imageRelative)

  const preorderContactUrl = product.board === 'preorder' && !product.available
    ? `https://wa.me/6581710548?text=${encodeURIComponent(`Hi DeepGmart, could you confirm the price and availability for pre-ordering ${product.title}?`)}`
    : null
  const caption =
    `🛍️ *${product.title}*\n` +
    `${product.pricingPending ? (product.board === 'wholesale' ? 'Bulk catalogue — prices and quantities coming soon' : 'Pre-order catalogue — price and availability pending') : product.board === 'preorder' ? (product.available ? 'Pre-orders open — awaiting arrival' : 'Pre-orders closed') : product.available ? '✅ In stock' : 'Currently out of stock'}\n` +
    `💰 Price: *${product.price}${product.unit ? ` per ${product.unit}` : ''}*\n` +
    `📁 Category: *${(product.dept || 'Grocery').toUpperCase()}*\n\n` +
    `📝 ${product.desc}\n\n` +
    (product.board === 'wholesale' ? wholesaleContact : preorderContactUrl ? `Contact on WhatsApp: ${preorderContactUrl}` : product.available ? '👇 *Choose Add to cart to select quantity:*' : 'Please check back for availability.')

  const message = {
    footer: `© DeepGmart Singapore • ${STORE_URL}`,
    interactiveButtons: [
      ...(!product.pricingPending && product.available ? [{
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🛒 Add to cart',
          id: `add_${product.id}`,
        }),
      }] : []),
      ...(preorderContactUrl ? [{
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: 'Contact on WhatsApp', url: preorderContactUrl }),
      }] : []),
      ...(product.url ? [{
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: '🌐 View in Web Shop',
          url: product.url,
        }),
      }] : []),
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
