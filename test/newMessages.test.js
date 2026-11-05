import test from 'node:test'
import assert from 'node:assert/strict'
import { createNewMessageFilter } from '../src/utils/newMessages.js'

const message = (id, timestamp = 100, fromMe = false) => ({ key: { id, fromMe }, messageTimestamp: timestamp, message: { conversation: 'menu' } })

test('ignores history, offline backlog, missing timestamps and messages before connection', () => {
  const filter = createNewMessageFilter()
  assert.equal(filter.accepts('notify',message('before')),false)
  filter.connected(100000)
  assert.equal(filter.accepts('append',message('history',101)),false)
  assert.equal(filter.accepts('notify',message('old',99)),false)
  assert.equal(filter.accepts('notify',{...message('missing'),messageTimestamp:undefined}),false)
  assert.equal(filter.accepts('notify',message('invalid','bad')),false)
  assert.equal(filter.accepts('notify',message('self',101,true)),false)
  assert.equal(filter.accepts('notify',message('new',101)),true)
  assert.equal(filter.accepts('notify',message('new',101)),false)
})

test('reconnect skips messages received while offline and accepts Baileys Long timestamps', () => {
  const filter = createNewMessageFilter()
  filter.connected(100000)
  assert.equal(filter.accepts('notify',message('first',101)),true)
  filter.disconnected()
  assert.equal(filter.accepts('notify',message('offline',102)),false)
  filter.connected(110000)
  assert.equal(filter.accepts('notify',message('backlog',105)),false)
  assert.equal(filter.accepts('notify',message('live',{toNumber:()=>111})),true)
})
