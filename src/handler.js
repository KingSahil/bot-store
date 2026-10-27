import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { resolveLidToPn } from './utils/resolveLid.js'
import { userState } from './data/userState.js'
import { sendProductMenu, sendDepartmentMenu } from './features/storeMenu.js'
import { showProductDetail } from './features/orderHandler.js'
import { showPaymentMenu, handlePayment } from './features/paymentMenu.js'
import { saveReceipt } from './features/uploadReceipt.js'
import { searchProducts, getProductBySlug } from './data/deepgmart.js'
import dotenv from 'dotenv'
import { respondToAdminAndUser } from './utils/orderResponse.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function handler(sock, msg, targetJid = null) {
  if (!msg?.message) return
  const from = targetJid || resolveLidToPn(msg.key?.remoteJid)
  if (!from) return

  const userText = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    ''
  ).trim()
  const lowerText = userText.toLowerCase()

  const state = userState.get(from) || { step: 'start' }

  let rowId = null
  try {
    if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
      const parsed = JSON.parse(
        msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
      )
      rowId = parsed.id
    } else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
      rowId = msg.message.listResponseMessage.singleSelectReply.selectedRowId
    }
  } catch (err) {
    console.error('[Interactive Response Parse Error]', err)
  }

  const btnId = 
    msg.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message?.templateButtonReplyMessage?.selectedId ||
    rowId

  // 1. Department selected from interactive menu
  if (rowId && rowId.startsWith('dept_')) {
    const deptIdx = parseInt(rowId.replace('dept_', ''))
    await sendDepartmentMenu(sock, from, deptIdx, msg)
    return
  }

  // 2. Product selected from interactive catalogue
  if (rowId && rowId.startsWith('prod_')) {
    await showProductDetail(sock, from, rowId, msg)
    userState.set(from, { step: 'product_selected', product: rowId })
    return
  }

  // 2. Buy now (button click or typing buy/order)
  if (btnId === 'buy_now' || rowId === 'buy_now' || lowerText === 'buy' || lowerText === 'buy now' || lowerText === 'order') {
    const cur = userState.get(from) || {}
    await showPaymentMenu(sock, from, cur.product || 'prod_punjabi-samosa', msg)
    return
  }

  // 3. Payment method selected
  if (rowId && rowId.startsWith('pay_')) {
    await handlePayment(sock, from, rowId, msg)
    return
  }
  if (['paynow', 'paylah', 'card', 'cod', 'cash'].includes(lowerText)) {
    const payId = lowerText === 'cash' ? 'pay_cod' : `pay_${lowerText}`
    await handlePayment(sock, from, payId, msg)
    return
  }

  // 4. Order proof & shipping address
  if (state.step === 'waiting_receipt' || state.step === 'waiting_address') {
    if (msg.message?.imageMessage || msg.message?.documentMessage) {
      await saveReceipt(sock, msg)
      return
    }

    if (userText) {
      const order = {
        id: state.orderId || `ORD-${Date.now()}`,
        user: from,
        product: state.product || null,
        paymentMethod: state.paymentMethod || null,
        receiptFile: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      await respondToAdminAndUser(sock, from, order, null, userText)
      userState.set(from, { step: 'done', product: state.product, paymentMethod: state.paymentMethod })
      return
    }
  }

  // 5. Department numbers 1 to 5
  if (['1', '2', '3', '4', '5'].includes(lowerText)) {
    const deptIdx = parseInt(lowerText) - 1
    await sendDepartmentMenu(sock, from, deptIdx, msg)
    return
  }

  // 6. Product search by user keyword (if user types "samosa", "lays", "paneer", "ghee", "eggs", "dew", etc.)
  if (userText && !['menu', 'hi', 'hello', 'hey', 'start', 'help', 'shop'].includes(lowerText)) {
    const searchResults = searchProducts(userText, 3)
    if (searchResults.length > 0) {
      const first = searchResults[0]
      await showProductDetail(sock, from, first.id, msg)
      userState.set(from, { step: 'product_selected', product: first.id })
      return
    }
  }

  // 7. Default: Main Store Catalogue Menu
  await sendProductMenu(sock, from, msg)
  userState.set(from, { step: 'menuMain' })
}