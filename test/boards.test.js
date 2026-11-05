import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolveConfig } from '../src/config.js'
import { belongsToBoard, boardTerms } from '../src/data/boardPolicy.js'

test('named instances have distinct session/state paths and validate configuration', () => {
  const configs = ['normal', 'preorder', 'wholesale'].map(BOT_MODE => resolveConfig({ BOT_MODE }))
  assert.equal(new Set(configs.map(c => c.authDir)).size, 3)
  assert.equal(new Set(configs.map(c => c.stateFile)).size, 3)
  assert.match(resolveConfig({}).authDir, /[\\/]session$/)
  assert.throws(() => resolveConfig({BOT_MODE:'typo'}), /BOT_MODE/)
  assert.throws(() => resolveConfig({BOT_PHONE_NUMBER:'invalid'}), /BOT_PHONE_NUMBER/)
})

test('legacy products are retail only and incomplete special terms fail closed', () => {
  assert.equal(belongsToBoard({}, 'normal'), true)
  assert.equal(belongsToBoard({}, 'preorder'), false)
  assert.equal(boardTerms({}, 'wholesale'), null)
  assert.equal(boardTerms({preorder:{arrival:'December',terms:'Await confirmation',cutoff:'2020-01-01'}}, 'preorder'), null)
})

test('each process filters direct product IDs, search, quantities, state and payment actions', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-bots-'))
  try {
    const products = [
      {slug:'retail',title:'Retail rice',price:200,dept:'rice',in_stock:true,purchasable:true},
      {slug:'bulk',title:'Bulk rice',price:200,dept:'rice',in_stock:true,purchasable:true,stock_board:'wholesale',wholesale:{pack_units:12,min_packs:3,increment:2,price_cents:1800}},
      {slug:'incoming',title:'Incoming rice',price:250,dept:'rice',in_stock:false,purchasable:true,stock_board:'preorder',preorder:{arrival:'December',terms:'Subject to supplier confirmation',accepting_orders:true}},
    ]
    const file = path.join(dir,'products.json')
    fs.writeFileSync(file, JSON.stringify(products))
    for (const mode of ['normal','wholesale','preorder']) {
      execFileSync(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        const {listProducts,getProductBySlug,searchProducts}=await import('./src/data/deepgmart.js');
        const {priceCart,review,pay}=await import('./src/features/shop.js');
        const {getState,setState}=await import('./src/data/shopState.js');
        const expected={normal:'retail',wholesale:'bulk',preorder:'incoming'}[process.env.BOT_MODE];
        assert.equal(listProducts().length,1);
        assert.equal(searchProducts('rice')[0].slug,expected);
        assert.equal(getProductBySlug('prod_'+expected).available,true);
        for(const slug of ['retail','bulk','incoming'].filter(x=>x!==expected)) assert.equal(getProductBySlug('prod_'+slug),null);
        const quantity=process.env.BOT_MODE==='wholesale'?3:1;
        const cart=[{product:'prod_'+expected,variant:null,quantity}];
        if(process.env.BOT_MODE==='wholesale') {
          assert.throws(()=>priceCart([{...cart[0],quantity:2}]),/Minimum/);
          assert.throws(()=>priceCart([{...cart[0],quantity:4}]),/Minimum/);
          assert.equal(priceCart(cart)[0].price,1800);
        }
        setState('same-customer',{cart,step:'browse'});
        const sent=[]; const sock={sendMessage:async(to,msg)=>sent.push(msg)};
        await review(sock,'same-customer','Jane, 10 Test Road, Singapore 123456');
        assert.equal(getState('same-customer').order.board,process.env.BOT_MODE);
        if(process.env.BOT_MODE!=='normal') {
          assert.deepEqual(getState('same-customer').choices,['pay_manual']);
          await assert.rejects(pay(sock,'same-customer','pay_card'),/requests only/);
          await assert.rejects(pay(sock,'same-customer','pay_cod'),/requests only/);
          await pay(sock,'same-customer','pay_manual');
          assert.equal(getState('same-customer').order.status,'awaiting_store_confirmation');
        }
      `], { cwd:process.cwd(), env:{...process.env,BOT_MODE:mode,PRODUCTS_JSON_PATH:file,BOT_STATE_PATH:path.join(dir,mode+'.json'),ADMIN_JID:'admin@s.whatsapp.net',BOT_CHECKOUT_SECRET:'x'.repeat(40),ENABLE_COD:'true'}, stdio:'pipe' })
    }
    assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.json')).length,4)
  } finally { fs.rmSync(dir,{recursive:true,force:true}) }
})
