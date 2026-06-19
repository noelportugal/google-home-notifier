# google-home-notifier

Send text-to-speech notifications — or play an MP3 — on your **Google Home / Nest** speakers.

> **What's new (1.3.0):** pure-JS device discovery via
> [`bonjour-service`](https://www.npmjs.com/package/bonjour-service) — **no more
> native `mdns` build**, no avahi system packages, no patching `node_modules`.
> `notify()`/`play()` now return Promises (so you can `await` them) while the old
> callback style keeps working unchanged. Upgraded to `google-tts-api` 2.x.

## Installation

```sh
npm install google-home-notifier
```

That's it — it installs and runs cross-platform (macOS / Linux / Raspberry Pi / Windows)
with no compilation step.

## Usage

```javascript
const googlehome = require('google-home-notifier');

// Target by name (discovered on your network)…
googlehome.device('Living Room');
// …or skip discovery if you know the IP:
// googlehome.ip('192.168.1.20');

// Promise / async (new):
await googlehome.notify('Hello, Google Home');

// Callback (still supported, unchanged):
googlehome.notify('Hello, Google Home', (res) => console.log(res));
```

### Language & accent

```javascript
googlehome.device('Living Room', 'en');   // language code (2nd arg)
googlehome.accent('co.uk');               // 'us' (default), 'co.uk', 'com.au', 'ca', …
await googlehome.notify('Right, then');
```

### Play an MP3

```javascript
await googlehome.play('http://example.com/sound.mp3');
```

> TTS notifications are limited to ~200 characters per request (a Google TTS limit).

## API

| Method | Description |
| --- | --- |
| `device(name, lang?)` | Target a device by (fuzzy) name. Chainable. |
| `ip(address, lang?)` | Target a device by IP, skipping discovery. Chainable. |
| `accent(code)` | TTS accent/host (`us`, `co.uk`, `com.au`, … or a full URL). Chainable. |
| `notify(text, cb?)` | Speak `text`. Returns a `Promise<string>`; `cb(result)` / `cb('error', err)` still work. |
| `play(url, cb?)` | Play an MP3 `url`. Same return/callback contract as `notify`. |

## HTTP listener (example.js)

`example.js` runs a tiny server so you can trigger notifications over HTTP — handy
with IFTTT, webhooks, or home automation. It uses [ngrok](https://ngrok.com/) to
expose the endpoint outside your network.

```sh
git clone https://github.com/noelportugal/google-home-notifier
cd google-home-notifier
npm install
node example.js
```

```
Endpoints:
    http://192.168.1.20:8091/google-home-notifier
    https://xxxxx.ngrok.io/google-home-notifier
GET:  curl -X GET "https://xxxxx.ngrok.io/google-home-notifier?text=Hello+Google+Home"
POST: curl -X POST -d "text=Hello Google Home" https://xxxxx.ngrok.io/google-home-notifier
```

If `text` starts with `http(s)://` it's played as an MP3; otherwise it's spoken.

## License

MIT © Noel Portugal
