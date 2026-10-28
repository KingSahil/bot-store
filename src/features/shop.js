import { sharedCheckout, sharedCheckoutEnabled } from './sharedCheckout.js'
import { promptDelivery } from './deliveryForm.js'
import { randomUUID } from 'node:crypto'
import { getProductBySlug, formatPrice, STORE_URL } from '../data/deepgmart.js'
import { getState, setState } from '../data/shopState.js'
import { sendChoices, quick } from './storeMenu.js'
export function priceCart(cart) {
  if (!cart?.length) throw new Error('Your cart is empty. Browse categories to add products.')
  return cart.map(item => {
    const p = getProductBySlug(item.product)
    const variant = p?.variants.find(v => v.id === item.variant)
    if (!p?.purchasable || !p.available || (p.variants.length && !variant?.available)) throw new Error(`${p?.title || 'Product'} is unavailable. Remove it from your cart.`)
    const price = variant?.price ?? p.price_cents
    if (!Number.isSafeInteger(price) || price <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error('Please check product price and quantity.')
    return { ...item, title: variant?.title || p.title, price }
  })
}
export async function showCart(sock, jid) {
  const state=getState(jid)
  const lines=state.cart.map((x,i) => {const p=getProductBySlug(x.product); return `${i+1}. ${p?.title || 'Unavailable item'} × ${x.quantity}`})
  let total=''
  try {total=`\nItems total: ${formatPrice(priceCart(state.cart).reduce((n,x)=>n+x.price*x.quantity,0))}`} catch(e) {total='\n'+e.message}
  return sock.sendMessage(jid,{text:'Your cart\n'+lines.join('\n')+total+'\nReply remove 1 to remove an item, or clear cart. Delivery fee is shown at checkout.',interactiveButtons:[quick('Checkout','checkout'),quick('Continue shopping','menu'),quick('Edit cart','edit_cart')]})
}
export async function chooseQuantity(sock,jid,product,variant=null) {
  const s=getState(jid); s.product=product; s.variant=variant; s.step='quantity'; setState(jid,s)
  return sendChoices(sock,jid,'Choose quantity, or type qty followed by a number (1–99).',[1,2,3,4,5].map(n=>({id:`qty_${n}`,title:String(n)})),[quick('View cart','cart')])
}
export async function beginAdd(sock,jid,id) {
  const p=getProductBySlug(id)
  if(!p?.purchasable || !p.available) throw new Error('This product is out of stock. Please choose another item.')
  if(p.variants.length>1) {
    const s=getState(jid);s.product=id;setState(jid,s)
    const variants=p.variants.filter(v=>v.available)
    if(variants.length>10) throw new Error('Please order this product’s variants through the web shop.')
    return sendChoices(sock,jid,'Choose a variant',variants.map(v=>({id:`variant_${v.id}`,title:v.title,description:formatPrice(v.price)})))
  }
  return chooseQuantity(sock,jid,id,p.variants[0]?.id || null)
}
export function addQuantity(jid,n) {
  const s=getState(jid)
  if(s.step!=='quantity' || !s.product || !Number.isInteger(n) || n<1 || n>99) throw new Error('Select a product and choose a quantity from 1 to 99.')
  const cart=[...s.cart];const existing=cart.find(x=>x.product===s.product && x.variant===s.variant)
  if(existing) existing.quantity+=n
  else cart.push({product:s.product,variant:s.variant,quantity:n})
  if(cart.length>50) throw new Error('Please checkout your current cart before adding more items.')
  priceCart(cart);s.cart=cart;s.step='browse';setState(jid,s)
}
async function stripe(endpoint, body=null, key=null) {
  const secret=process.env.STRIPE_SECRET_KEY
  if(!secret) throw new Error('Online payment is not configured yet. Your cart is saved; choose cash on delivery if available.')
  const response=await fetch('https://api.stripe.com/v1/'+endpoint,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${secret}`,...(key?{'Idempotency-Key':key}:{}),...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body}:{}),signal:AbortSignal.timeout(20000)})
  const data=await response.json()
  if(!response.ok) throw new Error('Payment service is unavailable. Your cart is saved. Please try again.')
  return data
}
export function deliveryFee(subtotal) {
  const configured = process.env.DELIVERY_FEE_CENTS?.trim()
  if (sharedCheckoutEnabled() || !configured) return subtotal >= 5000 ? 0 : 500
  if (!/^\d+$/.test(configured) || !Number.isSafeInteger(Number(configured))) throw new Error('Delivery pricing is invalid. Your cart is saved; please contact the store.')
  return Number(configured)
}
export async function checkout(sock,jid) {
  const s=getState(jid)
  const items=priceCart(s.cart)
  const fee=deliveryFee(items.reduce((n,x)=>n+x.price*x.quantity,0))
  s.deliveryDraft={};s.step=s.savedDelivery?'delivery_saved':'delivery_name';s.choices=[];setState(jid,s)
  if(s.savedDelivery) return sock.sendMessage(jid,{text:`*Delivery details*\n${s.savedDelivery.name}\n${s.savedDelivery.address}\nSingapore ${s.savedDelivery.postal}\n\nUse this saved address? Reply forget address to remove it.`,interactiveButtons:[quick('Use saved address','delivery_use_saved'),quick('New address','delivery_new'),quick('Cancel','cancel')]})
  await sock.sendMessage(jid,{text:`*Checkout*\nItems: ${formatPrice(items.reduce((n,x)=>n+x.price*x.quantity,0))}\nDelivery: ${fee ? formatPrice(fee) : 'Free'}\nTotal: ${formatPrice(items.reduce((n,x)=>n+x.price*x.quantity,0)+fee)}\n\nLet’s enter your delivery details, one step at a time.`})
  return promptDelivery(sock,jid)
}
export async function review(sock,jid,address,shipping=null) {
  if(address.length<15 || address.length>1000 || !/\b\d{6}\b/.test(address)) throw new Error('Please include your name, full address and 6-digit Singapore postal code.')
  const s=getState(jid);const items=priceCart(s.cart);const fee=deliveryFee(items.reduce((n,x)=>n+x.price*x.quantity,0))
  if(s.order) s.orders=[...(s.orders || []).filter(o=>o.id!==s.order.id),s.order]
  s.order={id:randomUUID(),items,address,...(shipping?{shipping}:{}),deliveryFee:fee,total:items.reduce((n,x)=>n+x.price*x.quantity,0)+fee,status:'awaiting_payment',createdAt:new Date().toISOString()};s.step='review';setState(jid,s)
  return sendChoices(sock,jid,`Review order\n${items.map(x=>`${x.title} × ${x.quantity} — ${formatPrice(x.price*x.quantity)}`).join('\n')}\nDelivery: S$${(fee/100).toFixed(2)}\nTotal: ${formatPrice(s.order.total)}\n${address}`,[...(sharedCheckoutEnabled()?[{id:'pay_card',title:'Pay securely online',description:'Available wallets, card or PayNow through Stripe'}]:[]),...(process.env.ENABLE_COD==='true'?[{id:'pay_cod',title:'Cash on delivery'}]:[]),...(!sharedCheckoutEnabled() && process.env.ENABLE_COD!=='true' && process.env.ADMIN_JID?[{id:'pay_manual',title:'Request confirmation',description:'Store confirms availability and payment instructions. Not paid.'}]:[])],[...(shipping?[quick('Edit delivery details','delivery_edit')]:[]),quick('Cancel checkout','cancel')])
}
export async function pay(sock,jid,method,orderId=null) {
  const s=getState(jid);const o=!orderId || s.order?.id===orderId?s.order:(s.orders || []).find(x=>x.id===orderId)
  if(!o || (!orderId && !['review','payment'].includes(s.step))) throw new Error('Please open your cart and checkout first.')
  if(o.status==='paid' || o.status==='cod_confirmed' || o.status==='awaiting_store_confirmation') throw new Error('This order is already confirmed.')
  if(!o.session && JSON.stringify(priceCart(s.cart))!==JSON.stringify(o.items)) throw new Error('Your cart or prices changed. Please checkout again.')
  if(method==='pay_manual') {
    if(!process.env.ADMIN_JID) throw new Error('Please contact the store to arrange your order.')
    o.status='awaiting_store_confirmation';s.step='done';s.cart=[];s.choices=[];setState(jid,s)
    await notify(sock,jid,o)
    return sock.sendMessage(jid,{text:`Order request ${o.id} sent to the store. Total: ${formatPrice(o.total)}. The store must confirm availability and payment instructions. This order is not paid.`,interactiveButtons:[quick('Continue shopping','menu'),quick('My orders','orders')]})
  }
  if(method==='pay_cod') {
    if(process.env.ENABLE_COD!=='true') throw new Error('Cash on delivery is unavailable.')
    if(o.session) throw new Error('This order already has a payment link. Continue shopping to create a separate cash-on-delivery order.')
    o.status='cod_confirmed';s.step='done';s.cart=[];s.choices=[];setState(jid,s)
    await notify(sock,jid,o)
    return sock.sendMessage(jid,{text:`Order ${o.id} confirmed. Pay ${formatPrice(o.total)} on delivery. No payment receipt is needed.`,interactiveButtons:[quick('Continue shopping','menu'),quick('My orders','orders')]})
  }
  if(o.session && !o.sharedCheckout) {
    return sock.sendMessage(jid,{text:`This is an earlier payment link. Check its status before creating another order.\n${o.url}`,interactiveButtons:[quick('Check payment',`status_${o.id}`)]})
  }
  // The website owns authoritative pricing, storage and Stripe credentials.
  const result=await sharedCheckout({requestId:o.id,phone:'+'+jid.split('@')[0],shipping:o.shipping,
    items:o.items.map(({product,variant,quantity})=>({product,variant,quantity})),...(o.session?{sessionId:o.session}:{})})
  if(!result.sessionId || !Number.isSafeInteger(result.total) || (!result.paid && !result.url)) throw new Error('Unable to open this payment. Please check your order status.')
  o.session=result.sessionId;o.url=result.url;o.orderNumber=result.orderNumber;o.total=result.total;o.deliveryFee=result.deliveryFee
  o.resultUrl=result.resultUrl;o.sharedCheckout=true;o.paymentState=result.paid?'paid':'pending'
  if(s.order?.id===o.id)s.step='payment'
  setState(jid,s)
  if(result.paid) return status(sock,jid,o.id)
  return sock.sendMessage(jid,{text:`*Ready to pay*\nOrder ${o.orderNumber}\nTotal: ${formatPrice(o.total)}\n\nChoose an available wallet, card or PayNow on the secure Stripe page.\nPayNow on this phone: save the QR image and upload it in your banking app.\n\n${o.url}\n\nWe will confirm here after payment is verified. If a wallet is missing, try opening the link in your phone’s browser.`,interactiveButtons:[{name:'cta_url',buttonParamsJson:JSON.stringify({display_text:`Pay securely · ${formatPrice(o.total)}`,url:o.url})},quick('Check payment',`status_${o.id}`),quick('Continue shopping','menu')]})
}

async function notify(sock,jid,o) {
  if(process.env.ADMIN_JID) {
    try {
      await sock.sendMessage(process.env.ADMIN_JID,{text:`Order ${o.orderNumber || o.id}\nCustomer: ${jid}\n${o.items.map(x=>`${x.title} × ${x.quantity}`).join('\n')}\n${o.address}\nTotal: ${formatPrice(o.total)}\nStatus: ${o.status}`})
      return true
    } catch { return false }
  }
  return true
}
export async function status(sock,jid,orderId=null,{automatic=false}={}) {
  const s=getState(jid);const o=!orderId || s.order?.id===orderId?s.order:(s.orders || []).find(order=>order.id===orderId)
  if(!o) throw new Error('No order yet. Reply cart to start checkout.')
  if(o.session && o.status!=='paid') {
    let verified=false
    if(o.sharedCheckout) {
      const result=await sharedCheckout(null,o.session)
      if(result.botOrder!==o.id || result.orderNumber!==o.orderNumber || result.total!==o.total) throw new Error('Payment details do not match this order. Please contact the store.')
      verified=result.paid===true
      o.paymentState=result.state
    } else {
      // Existing links remain verifiable while new orders use the shared backend.
      const session=await stripe('checkout/sessions/'+encodeURIComponent(o.session))
      verified=session.payment_status==='paid' && session.client_reference_id===o.id && session.metadata?.bot_order===o.id && session.amount_total===o.total && session.currency==='sgd'
      o.paymentState=session.status==='expired'?'expired':'pending'
    }
    if(verified) {
      o.status='paid'
      if(s.order?.id===o.id && JSON.stringify(s.cart)===JSON.stringify(o.items.map(({product,variant,quantity})=>({product,variant,quantity})))) {s.cart=[];s.step='done';s.choices=[]}
    }
    setState(jid,s)
  }
  if(o.status==='paid') {
    if(!o.adminNotified) {o.adminNotified=await notify(sock,jid,o);setState(jid,s)}
    if(!automatic || !o.customerNotified) {
      await sock.sendMessage(jid,{text:`*Payment confirmed*\nOrder ${o.orderNumber || o.id}\nTotal: ${formatPrice(o.total)}\n\nYour payment is verified and your order is confirmed. We will contact you about fulfilment.`,interactiveButtons:[quick('My orders','orders'),quick('Continue shopping','menu')]})
      o.customerNotified=true;setState(jid,s)
    }
    return
  }
  if(automatic) return
  const expired=o.paymentState==='expired'
  return sock.sendMessage(jid,{text:`Order ${o.orderNumber || o.id}: ${o.status==='cod_confirmed'?'Confirmed — pay on delivery.':o.status==='awaiting_store_confirmation'?'Awaiting store confirmation — not paid.':expired?'Payment link expired. Your order is saved. Request a fresh link to continue.':'Awaiting payment. If your bank shows a debit, check again before paying.'}`,interactiveButtons:[...(o.sharedCheckout && o.status==='awaiting_payment'?[quick(expired?'Get fresh payment link':'Continue payment',`resume_payment_${o.id}`)]:o.url && o.status==='awaiting_payment'?[{name:'cta_url',buttonParamsJson:JSON.stringify({display_text:'Pay this order',url:o.url})}]:[]),quick('Continue shopping','menu'),quick('My orders','orders')]})
}

export async function showOrders(sock,jid,page=0) {
  const s=getState(jid)
  const orders=[...(s.order?[s.order]:[]),...(s.orders || []).slice().reverse()].filter((o,i,all)=>all.findIndex(x=>x.id===o.id)===i)
  page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(orders.length/8)-1)))
  s.ordersPage=page;setState(jid,s)
  const rows=orders.slice(page*8,page*8+8).map(o=>({id:`status_${o.id}`,title:`Order ${o.id.slice(0,8)}`,description:`${formatPrice(o.total)} • ${o.status.replaceAll('_',' ')}`}))
  if(page>0)rows.push({id:'orders_previous',title:'Previous orders'})
  if((page+1)*8<orders.length)rows.push({id:'orders_next',title:'More orders'})
  return sendChoices(sock,jid,orders.length?'Your orders — select one to check its payment.':'No orders yet. Continue shopping to start.',rows,[quick('Continue shopping','menu'),quick('View cart','cart')])
}
export async function editCart(sock,jid,page=0) {
  const s=getState(jid)
  page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(s.cart.length/8)-1)))
  s.cartPage=page;setState(jid,s)
  const rows=s.cart.slice(page*8,page*8+8).map(x=>({id:`remove_item_${encodeURIComponent(x.product)}:${encodeURIComponent(x.variant || '')}`,title:getProductBySlug(x.product)?.title || 'Unavailable item',description:`Remove from cart • quantity ${x.quantity}`}))
  if(page>0)rows.push({id:'cart_previous',title:'Previous items'})
  if((page+1)*8<s.cart.length)rows.push({id:'cart_next',title:'More items'})
  return sendChoices(sock,jid,'Select an item to remove it from your cart.',rows,[quick('View cart','cart'),quick('Clear cart','clear cart')])
}
export function removeCartItem(jid,key) {
  const [product,variant]=key.split(':').map(decodeURIComponent)
  const s=getState(jid);s.cart=s.cart.filter(x=>x.product!==product || (x.variant || '')!==variant);s.choices=[];setState(jid,s)
}
