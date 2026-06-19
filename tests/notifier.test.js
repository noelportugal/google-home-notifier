'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

const MODULE = path.join(__dirname, '..', 'google-home-notifier.js')
function fresh() {
  delete require.cache[require.resolve(MODULE)]
  return require(MODULE)
}

const gh = require(MODULE)

test('accentToHost maps codes to translate hosts', () => {
  assert.equal(gh._accentToHost(), 'https://translate.google.com')
  assert.equal(gh._accentToHost('us'), 'https://translate.google.com')
  assert.equal(gh._accentToHost('en'), 'https://translate.google.com')
  assert.equal(gh._accentToHost('co.uk'), 'https://translate.google.co.uk')
  assert.equal(gh._accentToHost('com.au'), 'https://translate.google.com.au')
  assert.equal(gh._accentToHost('https://translate.google.ca'), 'https://translate.google.ca')
})

test('matchesDevice is space/dash/case insensitive and fuzzy', () => {
  assert.ok(gh._matchesDevice('Living Room', 'Living-Room-abc123._googlecast._tcp'))
  assert.ok(gh._matchesDevice('living room', 'Kitchen', 'Living Room')) // matches friendly name
  assert.ok(gh._matchesDevice('Office', 'office_speaker'))
  assert.ok(!gh._matchesDevice('Bedroom', 'Living Room', 'Kitchen'))
  assert.ok(!gh._matchesDevice('', 'anything'))
})

test('pickAddress prefers IPv4 then falls back', () => {
  assert.equal(gh._pickAddress({ addresses: ['fe80::1', '192.168.1.42'] }), '192.168.1.42')
  assert.equal(gh._pickAddress({ addresses: ['fe80::1'] }), 'fe80::1')
  assert.equal(gh._pickAddress({ addresses: [], referer: { address: '10.0.0.5' } }), '10.0.0.5')
  assert.equal(gh._pickAddress({}), null)
})

test('setters are chainable and return the api', () => {
  assert.equal(gh.device('Test'), gh)
  assert.equal(gh.ip('192.168.1.1'), gh)
  assert.equal(gh.accent('us'), gh)
  for (const fn of ['device', 'ip', 'accent', 'notify', 'play']) {
    assert.equal(typeof gh[fn], 'function', `${fn} should be a function`)
  }
})

test('notify returns a Promise and rejects with no device set (back-compat callback too)', async () => {
  const g = fresh()
  const p = g.notify('hello')
  assert.ok(typeof p.then === 'function', 'notify should return a thenable')
  await assert.rejects(() => p, /No device set/)

  // callback form still works: cb('error', err)
  const g2 = fresh()
  const err = await new Promise((resolve) => {
    g2.play('http://example.com/a.mp3', (res, e) => resolve(res === 'error' ? e : new Error('expected error')))
  })
  assert.match(err.message, /No device set/)
})
