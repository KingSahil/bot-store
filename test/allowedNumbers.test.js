import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAllowedNumbers, isSenderAllowed } from '../src/utils/allowedNumbers.js'
import { resolveConfig } from '../src/config.js'

test('unset and blank allow lists accept all senders', () => {
  for (const value of [undefined, '', '  ']) {
    const numbers = parseAllowedNumbers(value)
    assert.deepEqual(numbers, [])
    assert.equal(isSenderAllowed('919876543210@s.whatsapp.net', numbers), true)
  }
})

test('matches only listed international phone JIDs, including device-qualified JIDs', () => {
  const numbers = parseAllowedNumbers('+91 98765 43210,6581234567,919876543210')
  assert.deepEqual(numbers, ['919876543210', '6581234567'])
  assert.equal(isSenderAllowed('919876543210@s.whatsapp.net', numbers), true)
  assert.equal(isSenderAllowed('6581234567:2@s.whatsapp.net', numbers), true)
  for (const jid of ['919000000000@s.whatsapp.net','919876543210@lid','919876543210@g.us',null]) assert.equal(isSenderAllowed(jid,numbers),false)
  assert.deepEqual(resolveConfig({ALLOWED_NUMBERS:'6581234567'}).allowedNumbers,['6581234567'])
})

test('invalid nonblank restrictions stop configuration instead of allowing everyone', () => {
  for (const value of [',','123','abc','6581234567,','6581234567,bad']) assert.throws(()=>parseAllowedNumbers(value),/ALLOWED_NUMBERS/)
})
