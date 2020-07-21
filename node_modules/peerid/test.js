'use strict'

import test from 'ava'
import peerid from './'
import equals from 'buffer-equals'
import {Buffer} from 'safe-buffer'

test('random id', t => {
  const id = peerid()

  t.true(Buffer.isBuffer(id))
  t.is(id.length, 20)

  const maybe_void = id.slice(0, 9).toString('ascii')
  t.not(maybe_void, 'undefined')
})

test('string as prefix', t => {
  const prefix = '-UT1800-'
  const id = peerid(prefix)

  t.true(Buffer.isBuffer(id))
  t.is(id.length, 20)

  const maybe_prefix = id.slice(0, prefix.length).toString('ascii')
  t.is(maybe_prefix, prefix)
})

test('buffer as prefix', t => {
  const prefix = Buffer.from('-UT1800-')
  const id = peerid(prefix)

  t.true(Buffer.isBuffer(id))
  t.is(id.length, 20)

  const maybe_prefix = id.slice(0, prefix.length)
  t.true(equals(maybe_prefix, prefix))
})