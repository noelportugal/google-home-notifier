'use strict'

// Minimal HTTP wrapper around google-home-notifier.
//   GET  /google-home-notifier?text=Hello+Google+Home
//   POST /google-home-notifier   (form field: text=Hello Google Home)
// If `text` starts with http(s) it's treated as an MP3 URL to play.

const express = require('express')
const ngrok = require('ngrok')
const googlehome = require('./src/index.js')

const app = express()
const serverPort = 8091

const deviceName = 'Google Home'
let ip = '192.168.1.20'        // optional: set a fixed IP to skip discovery
const defaultLanguage = 'en'

app.use(express.urlencoded({ extended: false }))   // replaces body-parser

async function handle(req, res) {
  const text = (req.body && req.body.text) || req.query.text
  if (req.query.ip) ip = req.query.ip
  const language = req.query.language || defaultLanguage

  if (!text) {
    return res.send('Please pass ?text=Hello+Google+Home\n')
  }

  // Target by IP when provided (fast, no discovery), else by device name.
  if (ip) googlehome.ip(ip, language)
  else googlehome.device(deviceName, language)

  try {
    if (/^https?:\/\//i.test(text)) {
      await googlehome.play(text)
      res.send(`${deviceName} will play sound from url: ${text}\n`)
    } else {
      await googlehome.notify(text)
      res.send(`${deviceName} will say: ${text}\n`)
    }
  } catch (err) {
    console.error(err)
    res.status(500).send(`Error: ${err.message}\n`)
  }
}

app.get('/google-home-notifier', handle)
app.post('/google-home-notifier', handle)

app.listen(serverPort, async () => {
  console.log('Endpoints:')
  console.log(`    http://${ip}:${serverPort}/google-home-notifier`)
  try {
    const url = await ngrok.connect(serverPort)
    console.log(`    ${url}/google-home-notifier`)
    console.log('GET example:')
    console.log(`    curl -X GET ${url}/google-home-notifier?text=Hello+Google+Home`)
    console.log('POST example:')
    console.log(`    curl -X POST -d "text=Hello Google Home" ${url}/google-home-notifier`)
  } catch (err) {
    console.log('(ngrok not started — local endpoint above still works)')
  }
})
