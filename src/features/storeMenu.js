import { getCategories, listProducts, searchProducts } from '../data/deepgmart.js'
import { getState, setState } from '../data/shopState.js'
export const quick = (text, id) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: text, id }) })
export async function sendChoices(sock, from, text, rows, buttons = []) {
  // Numbered text remains usable on clients that do not render interactive lists.
  const state = getState(from)
  state.choices = rows.map(r => r.id)
  setState(from, state)
  return sock.sendMessage(from, {
    text: text + (rows.length ? '\n\n' + rows.map((r,i) => `${i+1}. ${r.title} — ${r.description || ''}`).join('\n') + '\n\nTap Select or reply with a number.' : ''),
    interactiveButtons: [...(rows.length ? [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Select', sections: [{ title: 'Choose an option', rows: rows.map(r => ({...r, title: r.title.slice(0,24), description: (r.description || '').slice(0,72)})) }] }) }] : []), ...buttons],
  })
}
export async function sendProductMenu(sock, from) {
  const categories = getCategories()
  return sendChoices(sock, from, 'Welcome to DeepGmart! Browse a category, type search followed by a product name, or reply cart.', categories.map(c => ({ id: `dept_${c.id}`, title: c.title, description: `${c.count} products` })), [quick('Search products','search'),quick('View cart','cart'),quick('My orders','orders')])
}
export async function sendDepartmentMenu(sock, from, dept, page = 0) {
  return sendProductPage(sock, from, listProducts(dept), `Category: ${dept}`, { dept, page })
}
export async function sendSearchMenu(sock, from, query, page = 0) {
  return sendProductPage(sock, from, searchProducts(query), `Results for "${query}"`, { query, page })
}
async function sendProductPage(sock, from, products, title, context) {
  const pages = Math.max(1, Math.ceil(products.length / 8))
  const page = Math.min(Math.max(0, context.page), pages - 1)
  const state = getState(from)
  state.browse = { ...context, page }
  state.step = 'browse'
  setState(from,state)
  const rows = products.slice(page*8,page*8+8).map(p => ({ id:p.id, title:p.title, description:`${p.price}${p.available ? '' : ' • Out of stock'}` }))
  if(page > 0) rows.push({id:'previous',title:'Previous page'})
  if(page+1 < pages) rows.push({id:'next',title:'Next page'})
  return sendChoices(sock,from,`${title} — ${products.length} results. Page ${page+1}/${pages}.${products.length ? '' : ' Try fewer words or another name.'}`,rows,[quick('Categories','menu'),quick('View cart','cart')])
}
