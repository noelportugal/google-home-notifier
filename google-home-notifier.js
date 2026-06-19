'use strict'
// Backward-compatibility shim: the implementation now lives in ./src/index.js
// (package "main" points there). This re-export keeps the historical
// `require('google-home-notifier/google-home-notifier.js')` path working.
module.exports = require('./src/index.js')
