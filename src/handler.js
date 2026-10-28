import { withChatLock } from './utils/chatQueue.js'
import { applyDeviceMode } from './utils/deviceMode.js'
import { actionCommands } from './utils/menuFallback.js'
import { deliverySteps, promptDelivery, handleDelivery } from './features/deliveryForm.js'
import { resolveLidToPn } from './utils/resolveLid.js'
import { getState, setState } from './data/shopState.js'
import { getProductBySlug } from './data/deepgmart.js'
import { sendProductMenu, sendDepartmentMenu, sendSearchMenu } from './features/storeMenu.js'
import { showProductDetail } from './features/orderHandler.js'
import { showCart, beginAdd, chooseQuantity, addQuantity, checkout, review, pay, status, showOrders, editCart, removeCartItem } from './features/shop.js'
export async function handler(sock,msg,targetJid=null) {
  if(!msg?.message) return
  const jid=targetJid || resolveLidToPn(msg.key?.remoteJid)
  if(!jid) return
  return withChatLock(jid,()=>handle(sock,msg,jid))
}
async function handle(sock,msg,jid) {
  const m=msg.message
  const text=(m.conversation || m.extendedTextMessage?.text || '').trim()
  const lower=text.toLowerCase()
  const s=applyDeviceMode(getState(jid),msg)
  setState(jid,s)
  let id=m.buttonsResponseMessage?.selectedButtonId || m.templateButtonReplyMessage?.selectedId || m.listResponseMessage?.singleSelectReply?.selectedRowId
  try {id ||= JSON.parse(m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}').id} catch {}
  if(!id && /^\d+$/.test(text) && s.step!=='address' && !deliverySteps.includes(s.step)) id=s.choices?.[Number(text)-1]
  const alias=Object.entries(actionCommands).find(([,value])=>value===lower)?.[0]
  const command=id || alias || lower
  try {
    if(['desktop','mobile','auto'].includes(command)) {s.uiPreference=command;if(command!=='auto')s.uiMode=command;else applyDeviceMode(s,msg);s.step='menu';s.choices=[];setState(jid,s);return await sendProductMenu(sock,jid)}
    if(['menu','hi','hello','hey','start','help','shop','cancel'].includes(command)) {s.step='menu';setState(jid,s);return await sendProductMenu(sock,jid)}
    if(command.startsWith('resume_payment_')) return await pay(sock,jid,'pay_card',command.slice(15))
    if(command==='forget address') {delete s.savedDelivery;s.rememberDelivery=false;setState(jid,s);return await sock.sendMessage(jid,{text:'Saved delivery address removed. Existing orders retain their delivery details.'})}
    if(command==='delivery_use_saved' && s.step==='delivery_saved') {s.deliveryDraft={...s.savedDelivery};setState(jid,s);return await promptDelivery(sock,jid,'delivery_confirm')}
    if(command==='delivery_new' && s.step==='delivery_saved') return await promptDelivery(sock,jid)
    if(command==='delivery_remember' && s.step==='delivery_confirm') {s.rememberDelivery=!s.rememberDelivery;if(!s.rememberDelivery)delete s.savedDelivery;setState(jid,s);return await promptDelivery(sock,jid,'delivery_confirm')}
    if(command==='cart') return await showCart(sock,jid)
    if(command==='orders') return await showOrders(sock,jid)
    if(command==='orders_next' || command==='orders_previous') return await showOrders(sock,jid,(s.ordersPage || 0)+(command==='orders_next'?1:-1))
    if(command.startsWith('status_')) return await status(sock,jid,command.slice(7))
    if(command==='edit_cart') return await editCart(sock,jid)
    if(command==='cart_next' || command==='cart_previous') return await editCart(sock,jid,(s.cartPage || 0)+(command==='cart_next'?1:-1))
    if(command.startsWith('remove_item_')) {removeCartItem(jid,command.slice(12));return await showCart(sock,jid)}
    if(command==='status') return await status(sock,jid)
    if(command==='clear cart') {s.cart=[];s.step='menu';s.choices=[];setState(jid,s);return await showCart(sock,jid)}
    if(/^remove \d+$/.test(command)) {s.cart.splice(Number(command.split(' ')[1])-1,1);s.choices=[];setState(jid,s);return await showCart(sock,jid)}
    if(command==='search') {s.step='search';s.choices=[];setState(jid,s);return await sock.sendMessage(jid,{text:'What are you looking for? Type a product name, brand or category.'})}
    if(lower.startsWith('search ')) return await sendSearchMenu(sock,jid,text.slice(7).trim())
    if(command==='delivery_edit' && s.step==='review') return await promptDelivery(sock,jid)
    if(deliverySteps.includes(s.step) && (text || id)) return await handleDelivery(sock,jid,text,id || alias)
    if(command.startsWith('dept_')) return await sendDepartmentMenu(sock,jid,command.slice(5))
    if(['next','previous'].includes(command) && s.browse) {const b=s.browse;return await (b.query?sendSearchMenu(sock,jid,b.query,b.page+(command==='next'?1:-1)):sendDepartmentMenu(sock,jid,b.dept,b.page+(command==='next'?1:-1)))}
    if(command.startsWith('prod_')) {const p=getProductBySlug(command);if(!p?.purchasable)throw new Error('Product unavailable. Reply menu.');s.product=command;s.step='product';s.choices=[];setState(jid,s);return await showProductDetail(sock,jid,command,msg)}
    if(command.startsWith('add_')) return await beginAdd(sock,jid,command.slice(4))
    if(['buy_now','buy','buy now','order','add'].includes(command)) {if(!s.product)throw new Error('Please choose a product first. Reply menu.');return await beginAdd(sock,jid,s.product)}
    if(command.startsWith('variant_')) {const v=getProductBySlug(s.product)?.variants.find(v=>v.id===command.slice(8)&&v.available);if(!v)throw new Error('Please select an available variant.');return await chooseQuantity(sock,jid,s.product,v.id)}
    if(command.startsWith('qty_') || /^qty \d+$/.test(lower) || (s.step==='quantity' && /^\d+$/.test(text))) {addQuantity(jid,Number(command.startsWith('qty_')?command.slice(4):lower.replace('qty ','')));return await showCart(sock,jid)}
    if(command==='checkout') return await checkout(sock,jid)
    if(['pay_card','pay_cod','pay_manual'].includes(command)) return await pay(sock,jid,command)
    if(s.step==='address' && text) return await review(sock,jid,text)
    if(text) return await sendSearchMenu(sock,jid,text)
    return await sendProductMenu(sock,jid)
  } catch(e) {await sock.sendMessage(jid,{text:e.message})}
}
