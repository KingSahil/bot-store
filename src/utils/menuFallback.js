export const actionCommands = {
  delivery_use_saved:'use saved address', delivery_new:'new address', delivery_remember:'remember address',
  orders:'orders', edit_cart:'edit cart', menu:'menu', search:'search', cart:'cart', checkout:'checkout', status:'status',
  cancel:'cancel', delivery_back:'back', delivery_confirm:'confirm details',
  delivery_edit:'edit details', pay_card:'pay online', pay_cod:'cash on delivery',
  pay_manual:'request confirmation', buy_now:'add',
}
export function fallbackContent(content) {
  let text = content.caption || content.text || ''
  const commands=[]
  const buttons=content.interactiveButtons || (content.buttons || []).map(b=>({name:'quick_reply',buttonParamsJson:JSON.stringify({id:b.buttonId,display_text:b.buttonText?.displayText})}))
  for (const button of buttons) {
    let p
    try {p=JSON.parse(button.buttonParamsJson)} catch {continue}
    if(button.name==='quick_reply') {
      const command=actionCommands[p.id] || (p.id?.startsWith('add_')?'add':p.id)
      if(command)commands.push(`${p.display_text || command}: reply ${command}`)
    }
    if(button.name==='cta_url' && p.url && !text.includes(p.url)) commands.push(`${p.display_text || 'Open'}: ${p.url}`)
  }
  if(commands.length)text+='\n\n'+commands.join('\n')
  text+='\n\nReply mobile for interactive buttons, desktop for text menus, or auto for device detection.'
  if(content.image)return {image:content.image,caption:text}
  if(content.video)return {video:content.video,caption:text}
  return {text}
}
