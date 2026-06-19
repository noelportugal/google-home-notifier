'use strict'

/**
 * google-home-notifier — speak text (or play an MP3) on Google Home / Nest.
 *
 * Public API is unchanged from 1.x:
 *   device(name, lang?) | ip(address, lang?) | accent(code) | notify(text, cb?) | play(url, cb?)
 *
 * What's new in this version, without breaking that contract:
 *   - mDNS discovery uses pure-JS `bonjour-service` (no native `mdns` build).
 *   - `notify`/`play` now ALSO return a Promise, so you can `await` them.
 *     Pass a callback and it still works exactly as before: cb(result) on
 *     success, cb('error', err) on failure.
 *   - Upgraded to google-tts-api 2.x.
 */

const { Client, DefaultMediaReceiver } = require('castv2-client')
const googleTTS = require('google-tts-api')
const { Bonjour } = require('bonjour-service')

let deviceName = null
let deviceAddress = null
let language = 'en'
let ttsHost = 'https://translate.google.com'

// --- pure helpers (exported for testing) ----------------------------------

/** Map an accent code to a Google Translate TTS host. */
function accentToHost(accent) {
  if (!accent) return 'https://translate.google.com'
  const a = String(accent).trim().toLowerCase()
  if (a.startsWith('http')) return accent          // full URL passed through
  if (a === 'us' || a === 'com' || a === 'en') return 'https://translate.google.com'
  return `https://translate.google.${a}`           // e.g. 'co.uk', 'com.au', 'ca'
}

/** Loose, space/dash/underscore-insensitive containment match for a device name. */
function matchesDevice(target, ...candidates) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[\s_-]+/g, '')
  const t = norm(target)
  if (!t) return false
  return candidates.some((c) => {
    const n = norm(c)
    return n && (n.includes(t) || t.includes(n))
  })
}

/** Prefer an IPv4 address from a discovered service. */
function pickAddress(service) {
  const addrs = (service && service.addresses) || []
  return (
    addrs.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a)) ||
    addrs[0] ||
    (service && service.referer && service.referer.address) ||
    null
  )
}

// --- discovery ------------------------------------------------------------

/** Resolve a Google Cast device's IP by (fuzzy) name via mDNS. */
function findDevice(name, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const bonjour = new Bonjour()
    const browser = bonjour.find({ type: 'googlecast' })
    const done = (fn) => { clearTimeout(timer); browser.stop(); bonjour.destroy(); fn() }
    const timer = setTimeout(() => {
      done(() => reject(new Error(`Device "${name}" not found on the network within ${timeoutMs}ms`)))
    }, timeoutMs)
    browser.on('up', (service) => {
      const friendly = service.txt && (service.txt.fn || service.txt.n)
      if (matchesDevice(name, service.name, service.fqdn, friendly)) {
        const addr = pickAddress(service)
        console.log('Device "%s" at %s:%d', service.name, addr, service.port)
        done(() => (addr ? resolve(addr) : reject(new Error('Found device but no usable address'))))
      }
    })
    browser.on('error', (err) => done(() => reject(err)))
  })
}

async function resolveAddress() {
  if (deviceAddress) return deviceAddress
  if (!deviceName) throw new Error('No device set — call device(name) or ip(address) first')
  deviceAddress = await findDevice(deviceName)
  return deviceAddress
}

// --- TTS + cast -----------------------------------------------------------

function getSpeechUrl(text) {
  if (String(text).length > 200) {
    throw new Error('Text is too long for a single TTS request (max 200 characters)')
  }
  return googleTTS.getAudioUrl(text, { lang: language, slow: false, host: ttsHost })
}

/** Connect to the device and play a media URL. Resolves with a status string. */
function castMedia(host, url) {
  return new Promise((resolve, reject) => {
    const client = new Client()
    let settled = false
    const finish = (fn) => {
      if (settled) return
      settled = true
      try { client.close() } catch { /* noop */ }
      fn()
    }
    client.on('error', (err) => finish(() => reject(err)))
    client.connect(host, () => {
      client.launch(DefaultMediaReceiver, (err, player) => {
        if (err) return finish(() => reject(err))
        const media = { contentId: url, contentType: 'audio/mp3', streamType: 'BUFFERED' }
        player.load(media, { autoplay: true }, (loadErr) => {
          if (loadErr) return finish(() => reject(loadErr))
          finish(() => resolve('Device notified'))
        })
      })
    })
  })
}

/** Bridge a promise to the legacy callback style while still returning it. */
function dualReturn(promise, callback) {
  if (typeof callback === 'function') {
    promise.then((res) => callback(res)).catch((err) => callback('error', err))
  }
  return promise
}

// --- public API (chainable setters, unchanged signatures) -----------------

const api = {}

api.device = function device(name, lang = 'en') {
  deviceName = name
  deviceAddress = null   // a new name invalidates any cached address
  language = lang
  return api
}

api.ip = function ip(address, lang = 'en') {
  deviceAddress = address
  language = lang
  return api
}

api.accent = function accent(code) {
  ttsHost = accentToHost(code)
  return api
}

api.notify = function notify(message, callback) {
  const p = (async () => {
    const host = await resolveAddress()
    return castMedia(host, getSpeechUrl(message))
  })()
  return dualReturn(p, callback)
}

api.play = function play(mp3Url, callback) {
  const p = (async () => {
    const host = await resolveAddress()
    return castMedia(host, mp3Url)
  })()
  return dualReturn(p, callback)
}

// Internal helpers exposed for tests (underscore-prefixed, not part of the API).
api._accentToHost = accentToHost
api._matchesDevice = matchesDevice
api._pickAddress = pickAddress

module.exports = api
