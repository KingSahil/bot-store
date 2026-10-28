import { getState, setState } from '../data/shopState.js'
import { quick } from './storeMenu.js'
import { review } from './shop.js'

export const deliverySteps = ['delivery_name','delivery_address','delivery_postal','delivery_confirm']
const fields = { delivery_name:'name', delivery_address:'address', delivery_postal:'postal' }
const prompts = {
  delivery_name: '*Delivery details · 1 of 3*\nWhat is your full name?\nType your name below.',
  delivery_address: '*Delivery details · 2 of 3*\nWhat is your Singapore delivery address?\nInclude the block or house number, street and unit number, if applicable. We’ll ask for your postal code next.',
  delivery_postal: '*Delivery details · 3 of 3*\nWhat is your 6-digit Singapore postal code?\nType all 6 digits, including any leading zero.',
}
export async function promptDelivery(sock,jid,step='delivery_name') {
  const s=getState(jid)
  s.deliveryDraft ||= {}
  s.step=step;s.choices=[];setState(jid,s)
  if(step==='delivery_confirm') return sock.sendMessage(jid,{
    text:`*Check your delivery details*\n\nName: ${s.deliveryDraft.name}\nAddress: ${s.deliveryDraft.address}\nPostal code: ${s.deliveryDraft.postal}\n\nTap Confirm details to review your order. To change a field, reply edit name, edit address or edit postal.\n\n${s.rememberDelivery?'Address reuse is on.':'Address reuse is off.'} You can remove a saved address anytime: reply forget address.`,
    interactiveButtons:[quick('Confirm details','delivery_confirm'),quick(s.rememberDelivery?'Don’t save address':'Save for next time','delivery_remember'),quick('Edit details','delivery_edit')],
  })
  return sock.sendMessage(jid,{
    text:prompts[step]+(s.deliveryDraft[fields[step]]?`\n\nCurrent: ${s.deliveryDraft[fields[step]]}`:'')+'\n\nReply back to go to the previous step, or cancel to return to shopping.',
    interactiveButtons:[...(step!=='delivery_name'?[quick('Back','delivery_back')]:[]),quick('Cancel','cancel')],
  })
}
export async function handleDelivery(sock,jid,text,id) {
  const s=getState(jid)
  if(!deliverySteps.includes(s.step)) throw new Error('Please tap Checkout to enter delivery details.')
  const command=id || text.toLowerCase()
  if(['delivery_edit','edit details'].includes(command)) return promptDelivery(sock,jid,'delivery_name')
  const edits={'edit name':'delivery_name','edit address':'delivery_address','edit postal':'delivery_postal'}
  if(edits[command]) return promptDelivery(sock,jid,edits[command])
  if(['delivery_back','back'].includes(command)) return promptDelivery(sock,jid,deliverySteps[Math.max(0,deliverySteps.indexOf(s.step)-1)])
  if(s.step==='delivery_confirm') {
    if(!['delivery_confirm','confirm','confirm details'].includes(command)) return promptDelivery(sock,jid,'delivery_confirm')
    const d=s.deliveryDraft
    if(!d?.name || !d.address || !/^\d{6}$/.test(d.postal || '')) return promptDelivery(sock,jid,'delivery_name')
    if(s.rememberDelivery) {s.savedDelivery={...d};setState(jid,s)}
    return review(sock,jid,`${d.name}\n${d.address}\nSingapore ${d.postal}`,d)
  }
  if(id) return promptDelivery(sock,jid,s.step)
  const value=text.trim()
  if(s.step==='delivery_name' && (value.length<2 || value.length>100 || !/\p{L}/u.test(value) || /[\r\n]/.test(value))) throw new Error('Please type your full name (2–100 characters).')
  if(s.step==='delivery_address' && (value.length<8 || value.length>200 || !/\p{L}/u.test(value) || !/\d/.test(value))) throw new Error('Please include your block or house number and street name, plus a unit number if applicable.')
  if(s.step==='delivery_postal' && (!/^\d{6}$/.test(value) || value==='000000')) throw new Error('Please type a 6-digit Singapore postal code, for example 012345.')
  s.deliveryDraft[fields[s.step]]=value
  setState(jid,s)
  return promptDelivery(sock,jid,deliverySteps[deliverySteps.indexOf(s.step)+1])
}
