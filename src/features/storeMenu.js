// src/features/storeMenu.js
import { getBannerBuffer, CURATED_CATALOGUE, STORE_URL } from '../data/deepgmart.js'

export async function sendProductMenu(sock, from, quotedMsg = null) {
  const buffer = getBannerBuffer()

  const listPayload = {
    title: 'DeepGmart Groceries',
    sections: CURATED_CATALOGUE.map(dept => ({
      title: dept.title,
      rows: dept.rows.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
      })),
    })),
  }

  const welcomeText =
    `🌟 *WELCOME TO DEEPGMART SINGAPORE* 🌟 🇸🇬\n\n` +
    `Your favorite Indian groceries, authentic spices, snacks, and daily essentials delivered right to your doorstep in Singapore!\n\n` +
    `👇 *Tap the button below to browse our catalogue & select any product to order:*`

  const message = {
    footer: `© DeepGmart Singapore • ${STORE_URL}`,
    interactiveButtons: [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: '📋 Browse Catalogue',
          sections: listPayload.sections,
        }),
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: '🌐 Visit Web Shop',
          url: STORE_URL,
        }),
      },
    ],
  }

  const options = quotedMsg ? { quoted: quotedMsg } : {}

  try {
    if (buffer) {
      await sock.sendMessage(from, {
        image: buffer,
        caption: welcomeText,
        ...message,
      }, options)
    } else {
      await sock.sendMessage(from, {
        text: welcomeText,
        ...message,
      }, options)
    }
    console.log('✅ Sent interactive DeepGmart catalogue to:', from)
  } catch (err) {
    console.error('[sendProductMenu Error]', err)
  }
}

export async function sendDepartmentMenu(sock, from, deptIndex, quotedMsg = null) {
  const dept = CURATED_CATALOGUE[deptIndex]
  if (!dept) {
    await sendProductMenu(sock, from, quotedMsg)
    return
  }

  const listPayload = {
    title: dept.title,
    sections: [
      {
        title: dept.title,
        rows: dept.rows.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
        })),
      },
    ],
  }

  const caption =
    `🏪 *${dept.title.toUpperCase()}*\n\n` +
    `Select any product from this department below to view details, prices, and order:`

  const message = {
    footer: `© DeepGmart Singapore • ${STORE_URL}`,
    interactiveButtons: [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: '🛒 Select Department Item',
          sections: listPayload.sections,
        }),
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '📋 Main Store Menu',
          id: 'menu',
        }),
      },
    ],
  }

  const options = quotedMsg ? { quoted: quotedMsg } : {}
  try {
    await sock.sendMessage(from, {
      text: caption,
      ...message,
    }, options)
    console.log(`✅ Sent interactive department menu (${dept.title}) to:`, from)
  } catch (err) {
    console.error('[sendDepartmentMenu Error]', err)
  }
}