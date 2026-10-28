import test from 'node:test'
import assert from 'node:assert/strict'
import { fallbackContent } from '../src/utils/menuFallback.js'
test('readable fallback exposes actions and links outside interactive envelope',()=>{
 const result=fallbackContent({text:'Your cart',interactiveButtons:[{name:'quick_reply',buttonParamsJson:JSON.stringify({display_text:'Checkout',id:'checkout'})},{name:'cta_url',buttonParamsJson:JSON.stringify({display_text:'Pay securely',url:'https://checkout.stripe.com/example'})}]})
 assert.match(result.text,/reply checkout/)
 assert.match(result.text,/https:\/\/checkout.stripe.com\/example/)
 assert.equal(result.interactiveButtons,undefined)
 const image=fallbackContent({image:Buffer.from('image'),caption:'Product',interactiveButtons:[{name:'quick_reply',buttonParamsJson:JSON.stringify({id:'add_prod_1',display_text:'Add to cart'})}]})
 assert.match(image.caption,/reply add/)
 assert.ok(image.image)
})

test('desktop sends one readable message; mobile sends one card with fallback on failure',async()=>{
 const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path')
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'desktop-transport-'))
 process.env.BOT_STATE_PATH=path.join(dir,'state.json')
 const {setState}=await import('../src/data/shopState.js')
 const {wrapSendMessageGlobally}=await import('../src/utils/typing.js')
 const jid='123456789@s.whatsapp.net';setState(jid,{cart:[],uiMode:'desktop'})
 let calls=[];let relays=0
 const sock={user:{id:'987654321@s.whatsapp.net'},sendMessage:async(to,content)=>{calls.push(content);return {key:{id:'test-sent'},message:{conversation:content.text}}},sendPresenceUpdate:async()=>{},relayMessage:async()=>{relays++}}
 wrapSendMessageGlobally(sock)
 try {
  await sock.sendMessage(jid,{text:'Your cart',interactiveButtons:[{name:'quick_reply',buttonParamsJson:JSON.stringify({id:'checkout',display_text:'Checkout'})}]})
  assert.equal(calls.length,1);assert.equal(relays,0)
  assert.match(calls[0].text,/reply checkout/);assert.equal(calls[0].interactiveButtons,undefined)
  setState(jid,{cart:[],uiMode:'mobile'});calls=[];relays=0
  await sock.sendMessage(jid,{text:'Choose quantity',interactiveButtons:[{name:'quick_reply',buttonParamsJson:JSON.stringify({id:'cart',display_text:'View cart'})}]})
  assert.equal(calls.length,0,'mobile must not send a second text message')
  assert.equal(relays,1,'mobile sends one interactive message')
  calls=[];relays=0
  sock.relayMessage=async()=>{relays++;throw new Error('Simulated send failure')}
  await sock.sendMessage(jid,{text:'Choose quantity',interactiveButtons:[{name:'quick_reply',buttonParamsJson:JSON.stringify({id:'cart',display_text:'View cart'})}]})
  assert.equal(calls.length,1,'failed native send uses one readable fallback')
  assert.equal(relays,1)
  assert.match(calls[0].text,/reply cart/)
 } finally {fs.rmSync(dir,{recursive:true,force:true})}
})
