import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDeviceMode } from '../src/utils/deviceMode.js'
const msg=id=>({key:{id}})
test('best-effort device detection switches presentation without changing cart',()=>{
 const state={cart:[{product:'rice',quantity:2}],step:'delivery_name'}
 applyDeviceMode(state,msg('3F1234567890123456'));assert.equal(state.uiMode,'desktop')
 applyDeviceMode(state,msg('3A'+'A'.repeat(18)));assert.equal(state.uiMode,'mobile')
 applyDeviceMode(state,msg('3E'+'B'.repeat(20)));assert.equal(state.uiMode,'desktop')
 applyDeviceMode(state,msg('A'.repeat(32)));assert.equal(state.uiMode,'mobile')
 assert.equal(state.step,'delivery_name');assert.equal(state.cart[0].quantity,2)
})
test('unknown IDs preserve presentation and explicit preferences override predictions',()=>{
 const state={uiMode:'desktop'}
 applyDeviceMode(state,msg('unknown'));assert.equal(state.uiMode,'desktop')
 state.uiPreference='mobile';applyDeviceMode(state,msg('3F1234567890123456'));assert.equal(state.uiMode,'mobile')
 state.uiPreference='desktop';applyDeviceMode(state,msg('3A'+'A'.repeat(18)));assert.equal(state.uiMode,'desktop')
 state.uiPreference='auto';applyDeviceMode(state,msg('3A'+'A'.repeat(18)));assert.equal(state.uiMode,'mobile')
 assert.equal(applyDeviceMode({},msg('unknown')).uiMode,undefined)
})
