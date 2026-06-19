'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

const MODULE = path.join(__dirname, '..', 'src', 'index.js')
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
  assert.equal(gh.volume(0.5), gh)
  assert.equal(gh.slow(), gh)
  for (const fn of ['device', 'ip', 'accent', 'volume', 'slow', 'notify', 'play']) {
    assert.equal(typeof gh[fn], 'function', `${fn} should be a function`)
  }
})

test('devices()/ips() are chainable and validate their input', () => {
  assert.equal(gh.devices(['Living Room', 'Kitchen']), gh)
  assert.equal(gh.ips(['192.168.1.20', '192.168.1.21']), gh)
  assert.throws(() => gh.devices('not-an-array'), /expects an array/)
  assert.throws(() => gh.ips('192.168.1.20'), /expects an array/)
})

test('notify still rejects when no targets are set', async () => {
  const g = fresh()
  await assert.rejects(() => g.notify('hi'), /No device set/)
})

test('getDevices resolves an array (empty within a short window)', async () => {
  const list = await gh.getDevices(150)
  assert.ok(Array.isArray(list), 'getDevices should resolve an array')
})

test('volume() ignores out-of-range / invalid values (stays chainable)', () => {
  // valid range and junk both return the api; invalid values are simply ignored
  for (const v of [0, 0.6, 1, -1, 2, NaN, 'loud', null]) {
    assert.equal(gh.volume(v), gh)
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
