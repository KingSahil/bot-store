import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bot-shop-'))
process.env.PRODUCTS_JSON_PATH=path.join(dir,'products.json')
process.env.BOT_STATE_PATH=path.join(dir,'state.json')
process.env.DELIVERY_FEE_CENTS='500'
process.env.ENABLE_COD='true'
process.env.BOT_CHECKOUT_SECRET=''
process.env.ADMIN_JID='admin@s.whatsapp.net'
const products=Array.from({length:19},(_,i)=>({id:String(i),slug:`rice-${i}`,title:`Basmati Rice ${i}`,dept:'pantry',price:200,in_stock:i!==0,purchasable:true,variants:[]}))
fs.writeFileSync(process.env.PRODUCTS_JSON_PATH,JSON.stringify(products))
const {handler}=await import('../src/handler.js')
const {getState,setState}=await import('../src/data/shopState.js')
const {listProducts,searchProducts}=await import('../src/data/deepgmart.js')
const {priceCart, pay, status, deliveryFee}=await import('../src/features/shop.js')
const jid='customer@s.whatsapp.net'
let sent=[]
const sock={sendMessage:async(to,content)=>{sent.push({to,...content})}}
const say=async(text)=>handler(sock,{key:{remoteJid:jid},message:{conversation:text}},jid)
const tap=async(id)=>handler(sock,{key:{remoteJid:jid},message:{interactiveResponseMessage:{nativeFlowResponseMessage:{paramsJson:JSON.stringify({id})}}}},jid)
test('category, pagination, search, quantity, persisted cart and COD checkout',async()=>{
 await say('menu');assert.equal(getState(jid).choices[0],'dept_pantry')
 await tap('dept_pantry');assert.equal(getState(jid).choices.length,9)
 await tap('next');assert.equal(getState(jid).browse.page,1)
 await say('search rice basmati');assert.equal(getState(jid).browse.query,'rice basmati');assert.match(sent.at(-1).text,/19 results/)
 await tap('prod_rice-1');await tap('add_prod_rice-1');await tap('qty_2')
 assert.equal(getState(jid).cart[0].quantity,2)
 assert.equal(JSON.parse(fs.readFileSync(process.env.BOT_STATE_PATH))[jid].cart[0].quantity,2)
 await say('checkout');assert.equal(getState(jid).step,'delivery_name')
 await say('search basmati');assert.equal(getState(jid).step,'browse')
 await say('checkout');await say('Jane Tan');await say('10 Test Street #01-02');await say('123456');await tap('delivery_confirm')
 assert.equal(getState(jid).order.total,900)
 await tap('pay_cod');assert.equal(getState(jid).order.status,'cod_confirmed');assert.equal(getState(jid).cart.length,0)
 assert.match(sent.at(-1).text,/No payment receipt/)
 assert.ok(sent.some(x=>x.to===process.env.ADMIN_JID && /Rice/.test(x.text)))
})
test('no default purchase; unavailable products blocked and inventory refreshed',async()=>{
 setState(jid,{cart:[],step:'menu'});await say('buy');assert.match(sent.at(-1).text,/choose a product/)
 await tap('prod_rice-0');await tap('add_prod_rice-0');assert.match(sent.at(-1).text,/out of stock/)
 assert.throws(()=>priceCart([{product:'prod_rice-0',quantity:1}]),/unavailable/)
 assert.equal(searchProducts('rice basmati').length,19)
 fs.writeFileSync(process.env.PRODUCTS_JSON_PATH,'[]');assert.equal(listProducts().length,0)
 fs.writeFileSync(process.env.PRODUCTS_JSON_PATH,'invalid');assert.equal(listProducts().length,0)
})
test('shared checkout reuses references and only matching verified payments confirm',async()=>{
 fs.writeFileSync(process.env.PRODUCTS_JSON_PATH,JSON.stringify(products))
 process.env.BOT_CHECKOUT_SECRET='x'.repeat(40)
 const cart=[{product:'prod_rice-1',variant:null,quantity:2}]
 const items=priceCart(cart)
 setState(jid,{cart,step:'review',order:{id:'test-order',items,total:900,deliveryFee:500,address:'Test Singapore 123456',shipping:{name:'Jane Tan',address:'10 Test Street',postal:'123456'},status:'awaiting_payment'}})
 const original=globalThis.fetch;let creates=0;let amount=800;let paid=false
 globalThis.fetch=async(url,options)=>({ok:true,json:async()=>{
  assert.match(String(url),/api\/bot\/checkout/)
  assert.equal(options.headers.Authorization,'Bearer '+'x'.repeat(40))
  if(options.method==='POST') {creates++;const b=JSON.parse(options.body);assert.equal(b.requestId,'test-order');assert.equal(b.items[0].product,'prod_rice-1');if(creates>1)assert.equal(b.sessionId,'cs_test_fake');return {sessionId:'cs_test_fake',url:'https://checkout.stripe.com/test',orderNumber:'DG-WA-test-order',total:900,deliveryFee:500}}
  return {paid,botOrder:'test-order',orderNumber:'DG-WA-test-order',total:amount,state:paid?'paid':'pending'}
 }})
 try {
  await pay(sock,jid,'pay_card');await pay(sock,jid,'pay_card');assert.equal(creates,2)
  assert.equal(getState(jid).order.session,'cs_test_fake')
  await assert.rejects(status(sock,jid),/do not match/)
  paid=true;await assert.rejects(status(sock,jid),/do not match/)
  amount=900;await status(sock,jid);assert.equal(getState(jid).order.status,'paid');assert.deepEqual(getState(jid).cart,[])
  assert.equal(getState(jid).order.customerNotified,true);assert.equal(getState(jid).order.adminNotified,true)
  const count=sent.length;await status(sock,jid,null,{automatic:true});assert.equal(sent.length,count)
 } finally {globalThis.fetch=original;process.env.BOT_CHECKOUT_SECRET=''}
})

test('unset delivery settings use website rules and manual order request remains unpaid',async()=>{
 delete process.env.DELIVERY_FEE_CENTS
 assert.equal(deliveryFee(3900),500)
 assert.equal(deliveryFee(4999),500)
 assert.equal(deliveryFee(5000),0)
 process.env.DELIVERY_FEE_CENTS='';assert.equal(deliveryFee(3900),500)
 process.env.DELIVERY_FEE_CENTS='0';assert.equal(deliveryFee(3900),0)
 process.env.DELIVERY_FEE_CENTS='bad';assert.throws(()=>deliveryFee(3900),/invalid/)
 delete process.env.DELIVERY_FEE_CENTS
 process.env.ENABLE_COD='false'
 setState(jid,{cart:[{product:'prod_rice-1',variant:null,quantity:10}],step:'menu'})
 await say('checkout');assert.equal(getState(jid).step,'delivery_name');assert.match(sent.at(-2).text,/S\$5.00/)
 await say('Jane Tan');await say('10 Test Street #01-02');await say('123456');await tap('delivery_confirm')
 assert.equal(getState(jid).order.total,2500);assert.deepEqual(getState(jid).choices,['pay_manual'])
 await tap('pay_manual');assert.equal(getState(jid).order.status,'awaiting_store_confirmation');assert.match(sent.at(-1).text,/not paid/)
 await say('status');assert.match(sent.at(-1).text,/Awaiting store confirmation/)
})
test('delivery form validates each field, allows edits, and keeps leading zero postal codes',async()=>{
 setState(jid,{cart:[{product:'prod_rice-1',variant:null,quantity:1}],step:'menu'})
 await say('checkout')
 await say('Sahil');assert.equal(getState(jid).step,'delivery_address')
 await say('back');assert.equal(getState(jid).step,'delivery_name')
 await say('Sahil Gupta');await say('mahal');assert.equal(getState(jid).step,'delivery_address')
 await say('10 Test Street #02-03');assert.equal(getState(jid).step,'delivery_postal')
 await say('123');assert.equal(getState(jid).step,'delivery_postal')
 await say('012345');assert.equal(getState(jid).step,'delivery_confirm');assert.equal(getState(jid).deliveryDraft.postal,'012345')
 await say('edit name');await say('Sahil G');await say('10 New Street');await say('012345')
 await tap('delivery_confirm');assert.equal(getState(jid).order.shipping.name,'Sahil G');assert.equal(getState(jid).order.shipping.postal,'012345')
 await tap('delivery_edit');assert.equal(getState(jid).step,'delivery_name')
 await say('cancel');assert.equal(getState(jid).step,'menu');assert.equal(getState(jid).cart.length,1)
})
test('desktop mode persists and plain commands complete checkout',async()=>{
 process.env.ENABLE_COD='true'
 setState(jid,{cart:[],step:'menu'})
 await say('desktop');assert.equal(getState(jid).uiMode,'desktop')
 await say('1');assert.equal(getState(jid).browse.dept,'pantry')
 await say('2');assert.equal(getState(jid).product,'prod_rice-1')
 await say('add');await say('2');assert.equal(getState(jid).cart[0].quantity,2)
 await say('checkout');await say('Jane Tan');await say('10 Test Street');await say('012345')
 await say('confirm details');assert.equal(getState(jid).step,'review')
 await say('cash on delivery');assert.equal(getState(jid).order.status,'cod_confirmed')
 await say('mobile');assert.equal(getState(jid).uiMode,'mobile')
})
test('pending payment does not block another order; old payment check preserves new cart',async()=>{
 process.env.STRIPE_SECRET_KEY='sk_test_fake'
 const cart=[{product:'prod_rice-1',variant:null,quantity:2}]
 const old={id:'older-pending',items:priceCart(cart),session:'cs_test_old',url:'https://checkout.stripe.com/old',total:900,deliveryFee:500,status:'awaiting_payment'}
 setState(jid,{cart,step:'payment',order:old})
 await tap('menu');await tap('prod_rice-1');await tap('add_prod_rice-1');await tap('qty_1')
 assert.equal(getState(jid).cart[0].quantity,3)
 await tap('checkout');assert.equal(getState(jid).step,'delivery_name')
 await say('Jane Tan');await say('10 Test Street');await say('012345');await tap('delivery_confirm')
 const current=getState(jid).order.id
 assert.notEqual(current,old.id);assert.equal(getState(jid).orders[0].session,'cs_test_old')
 const original=globalThis.fetch
 globalThis.fetch=async()=>({ok:true,json:async()=>({payment_status:'paid',client_reference_id:old.id,metadata:{bot_order:old.id},amount_total:900,currency:'sgd'})})
 try {await tap('status_'+old.id)} finally {globalThis.fetch=original;delete process.env.STRIPE_SECRET_KEY}
 assert.equal(getState(jid).orders[0].status,'paid')
 assert.equal(getState(jid).order.id,current);assert.equal(getState(jid).order.status,'awaiting_payment')
 assert.equal(getState(jid).cart[0].quantity,3);assert.equal(getState(jid).step,'review')
 await tap('orders');assert.ok(getState(jid).choices.includes('status_'+old.id))
 await tap('edit_cart');const remove=getState(jid).choices[0];await tap(remove)
 assert.equal(getState(jid).cart.length,0)
})

test('saved delivery requires opt in, can be reused and forgotten',async()=>{
 setState(jid,{cart:[{product:'prod_rice-1',variant:null,quantity:1}],step:'menu'})
 await say('checkout');await say('Jane Tan');await say('10 Test Street');await say('012345')
 assert.equal(getState(jid).savedDelivery,undefined)
 await tap('delivery_remember');await tap('delivery_confirm')
 assert.equal(getState(jid).savedDelivery.postal,'012345')
 await say('cancel');await say('checkout');assert.equal(getState(jid).step,'delivery_saved')
 await say('use saved address');assert.equal(getState(jid).step,'delivery_confirm')
 await say('forget address');assert.equal(getState(jid).savedDelivery,undefined)
 assert.equal(getState(jid).rememberDelivery,false)
})

test('expired archived shared payment renews the same order without replacing the new cart',async()=>{
 process.env.BOT_CHECKOUT_SECRET='x'.repeat(40)
 const old={id:'expired-order',items:priceCart([{product:'prod_rice-1',variant:null,quantity:1}]),session:'cs_test_expired',sharedCheckout:true,orderNumber:'DG-WA-expired-order',total:700,deliveryFee:500,status:'awaiting_payment',paymentState:'expired',shipping:{name:'Jane Tan',address:'10 Test Street',postal:'012345'}}
 const newCart=[{product:'prod_rice-2',variant:null,quantity:3}]
 setState(jid,{cart:newCart,step:'browse',orders:[old]})
 const original=globalThis.fetch
 globalThis.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);assert.equal(b.requestId,old.id);assert.equal(b.sessionId,old.session);return {ok:true,json:async()=>({sessionId:'cs_test_renewed',url:'https://checkout.stripe.com/new',orderNumber:old.orderNumber,total:700,deliveryFee:500})}}
 try {await tap('resume_payment_'+old.id);assert.equal(getState(jid).orders[0].session,'cs_test_renewed');assert.deepEqual(getState(jid).cart,newCart);assert.equal(getState(jid).step,'browse')}
 finally {globalThis.fetch=original;process.env.BOT_CHECKOUT_SECRET=''}
})

test('automatic verification retries failed notifications and preserves a newer cart',async()=>{
 process.env.BOT_CHECKOUT_SECRET='x'.repeat(40)
 const old={id:'pending-auto',session:'cs_test_pending',orderNumber:'DG-WA-pending-auto',sharedCheckout:true,status:'awaiting_payment',total:700,items:priceCart([{product:'prod_rice-1',variant:null,quantity:1}])}
 const cart=[{product:'prod_rice-2',variant:null,quantity:2}]
 setState(jid,{cart,step:'browse',orders:[old]})
 const original=globalThis.fetch
 globalThis.fetch=async()=>({ok:true,json:async()=>({paid:true,state:'paid',botOrder:old.id,orderNumber:old.orderNumber,total:700})})
 let attempts=0
 const flaky={sendMessage:async(to,content)=>{if(to===jid && ++attempts===1)throw new Error('offline');sent.push({to,...content})}}
 try {
  await assert.rejects(status(flaky,jid,old.id,{automatic:true}),/offline/)
  assert.equal(getState(jid).orders[0].status,'paid');assert.ok(!getState(jid).orders[0].customerNotified)
  await status(flaky,jid,old.id,{automatic:true});assert.equal(getState(jid).orders[0].customerNotified,true)
  assert.deepEqual(getState(jid).cart,cart);assert.equal(getState(jid).step,'browse')
 } finally {globalThis.fetch=original;process.env.BOT_CHECKOUT_SECRET=''}
})


test('connected monitor resumes pending payments and restart does not repeat acknowledged messages',async()=>{
 const {startPaymentMonitor}=await import('../src/features/paymentMonitor.js')
 process.env.BOT_CHECKOUT_SECRET='x'.repeat(40)
 const order={id:'monitor-order',session:'cs_test_monitor',orderNumber:'DG-WA-monitor-order',sharedCheckout:true,status:'awaiting_payment',total:700,items:priceCart([{product:'prod_rice-1',variant:null,quantity:1}])}
 setState(jid,{cart:[],step:'menu',order})
 const original=globalThis.fetch
 globalThis.fetch=async()=>({ok:true,json:async()=>({paid:true,state:'paid',botOrder:order.id,orderNumber:order.orderNumber,total:700})})
 let stop=()=>{}
 try {
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{stop();reject(new Error('Monitor did not confirm'))},1500)
   stop=startPaymentMonitor({sendMessage:async(to,content)=>{sent.push({to,...content});if(to===jid){clearTimeout(timeout);resolve()}}},{intervalMs:20})
  })
  stop()
  // Let the notification success marker finish persisting before restarting.
  await new Promise(resolve=>setTimeout(resolve,20))
  assert.equal(getState(jid).order.customerNotified,true)
  const count=sent.length
  stop=startPaymentMonitor(sock,{intervalMs:20})
  await new Promise(resolve=>setTimeout(resolve,50))
  assert.equal(sent.length,count)
 } finally {stop();globalThis.fetch=original;process.env.BOT_CHECKOUT_SECRET=''}
})

test.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
