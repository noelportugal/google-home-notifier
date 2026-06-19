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

let targets = []         // [{ name?, address?, _address? }] — one or many devices
let language = 'en'
let ttsHost = 'https://translate.google.com'
let volumeLevel = null   // null = leave device volume untouched
let slowSpeech = false

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

/** Resolve a single target to an IP (cached on the target), discovering by name if needed. */
async function resolveTarget(t) {
  if (t.address) return t.address
  if (t._address) return t._address
  t._address = await findDevice(t.name)
  return t._address
}

/** Label for a target, for multi-device result reporting. */
function targetLabel(t) {
  return t.name || t.address || 'device'
}

/**
 * Fan a media URL out to every configured target.
 *  - single target: resolves with the status string and rejects on failure (1.x behavior)
 *  - multiple targets: resolves with an array of { device, result }/{ device, error }
 *    using allSettled, so one offline speaker never blocks the others.
 */
async function broadcast(url) {
  if (!targets.length) {
    throw new Error('No device set — call device(name)/ip(address) or devices([...])/ips([...]) first')
  }
  if (targets.length === 1) {
    const host = await resolveTarget(targets[0])
    return castMedia(host, url)
  }
  const settled = await Promise.allSettled(
    targets.map(async (t) => castMedia(await resolveTarget(t), url))
  )
  return settled.map((r, i) => (
    r.status === 'fulfilled'
      ? { device: targetLabel(targets[i]), result: r.value }
      : { device: targetLabel(targets[i]), error: r.reason && r.reason.message }
  ))
}

// --- TTS + cast -----------------------------------------------------------

function getSpeechUrl(text) {
  if (String(text).length > 200) {
    throw new Error('Text is too long for a single TTS request (max 200 characters)')
  }
  return googleTTS.getAudioUrl(text, { lang: language, slow: slowSpeech, host: ttsHost })
}

/** Connect to the device and play a media URL. Resolves with a status string. */
function castMedia(host, url) {
  return new Promise((resolve, reject) => {
    const client = new Client()
    let settled = false
    let priorVolume = null   // restored after playback if we changed it

    const finish = (fn) => {
      if (settled) return
      settled = true
      const close = () => { try { client.close() } catch { /* noop */ } finish.done = true; fn() }
      if (priorVolume != null) client.setVolume(priorVolume, close)
      else close()
    }

    client.on('error', (err) => finish(() => reject(err)))

    const launch = () => {
      client.launch(DefaultMediaReceiver, (err, player) => {
        if (err) return finish(() => reject(err))
        const media = { contentId: url, contentType: 'audio/mp3', streamType: 'BUFFERED' }
        player.load(media, { autoplay: true }, (loadErr) => {
          if (loadErr) return finish(() => reject(loadErr))
          // If we changed the volume, wait for playback to finish so we can
          // restore it; otherwise resolve immediately (original 1.x behavior).
          if (priorVolume == null) return finish(() => resolve('Device notified'))
          let started = false
          player.on('status', (status) => {
            if (status.playerState === 'PLAYING' || status.playerState === 'BUFFERING') started = true
            else if (started && status.playerState === 'IDLE') finish(() => resolve('Device notified'))
          })
        })
      })
    }

    client.connect(host, () => {
      if (volumeLevel == null) return launch()
      // Save current volume, set the requested level, then play.
      client.getVolume((err, vol) => {
        if (!err && vol) priorVolume = vol
        client.setVolume({ level: volumeLevel }, () => launch())
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
  targets = [{ name }]
  language = lang
  return api
}

api.ip = function ip(address, lang = 'en') {
  targets = [{ address }]
  language = lang
  return api
}

/** Target several devices by name; notify/play fan out to all of them. */
api.devices = function devices(names, lang = 'en') {
  if (!Array.isArray(names)) throw new TypeError('devices(names) expects an array of device names')
  targets = names.map((name) => ({ name }))
  language = lang
  return api
}

/** Target several devices by IP; notify/play fan out to all of them. */
api.ips = function ips(addresses, lang = 'en') {
  if (!Array.isArray(addresses)) throw new TypeError('ips(addresses) expects an array of IP addresses')
  targets = addresses.map((address) => ({ address }))
  language = lang
  return api
}

api.accent = function accent(code) {
  ttsHost = accentToHost(code)
  return api
}

/** Set notification volume (0.0–1.0). The prior device volume is restored after. */
api.volume = function volume(level) {
  const n = Number(level)
  if (Number.isFinite(n) && n >= 0 && n <= 1) volumeLevel = n
  return api
}

/** Toggle slower TTS speech (default: normal speed). */
api.slow = function slow(enabled = true) {
  slowSpeech = !!enabled
  return api
}

api.notify = function notify(message, callback) {
  const p = (async () => broadcast(getSpeechUrl(message)))()
  return dualReturn(p, callback)
}

api.play = function play(mp3Url, callback) {
  const p = (async () => broadcast(mp3Url))()
  return dualReturn(p, callback)
}

// Internal helpers exposed for tests (underscore-prefixed, not part of the API).
api._accentToHost = accentToHost
api._matchesDevice = matchesDevice
api._pickAddress = pickAddress

module.exports = api
