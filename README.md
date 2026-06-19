# google-home-notifier

Send text-to-speech notifications — or play an MP3 — on your **Google Home / Nest** speakers.

> **What's new (1.3.0):** pure-JS device discovery via
> [`bonjour-service`](https://www.npmjs.com/package/bonjour-service) — **no more
> native `mdns` build**, no avahi system packages, no patching `node_modules`.
> `notify()`/`play()` now return Promises (so you can `await` them) while the old
> callback style keeps working unchanged. Upgraded to `google-tts-api` 2.x. New
> `volume()` and `slow()` controls.

## Why this still exists in 2026

Google never shipped an official API for "make my speaker say this." The
[Google Assistant SDK](https://developers.google.com/assistant/sdk/overview) is
experimental / non-commercial and explicitly **can't broadcast voice messages**;
the newer [Google Home APIs](https://developers.googleblog.com/en/build-the-future-of-home-with-google-home-apis/)
are for **device control + automations + Matter**, not media or text-to-speech.
So casting a generated TTS clip to the speaker — exactly what this library does,
and what Home Assistant does under the hood — is still the way to do it. This is
a tiny, dependency-light alternative to running a whole home-automation stack.

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

### Multiple devices

```javascript
googlehome.devices(['Living Room', 'Kitchen', 'Office']);   // by name
// or: googlehome.ips(['192.168.1.20', '192.168.1.21']);

const results = await googlehome.notify('Dinner is ready');
// → [ { device: 'Living Room', result: 'Device notified' },
//     { device: 'Kitchen',    result: 'Device notified' },
//     { device: 'Office',     error: '...' } ]   // one offline speaker won't block the rest
```

With a single device (`device()`/`ip()`) the result is just the status string, as before.

### Discover every device, then announce to all

```javascript
const list = await googlehome.getDevices();
// → [ { name: 'Living Room', address: '192.168.1.20', port: 8009 }, … ]

// announce to all of them:
googlehome.ips(list.map((d) => d.address));
await googlehome.notify('Good morning!');

// …or loop yourself:
for (const d of list) {
  await googlehome.ip(d.address).notify(`Hello from ${d.name}`);
}
```

`getDevices(timeoutMs = 3000)` browses the network for the given window and returns
every Google Cast device it sees (deduped).

### Volume & speech rate

```javascript
googlehome.volume(0.6);   // 0.0–1.0; the device's prior volume is restored afterwards
googlehome.slow(true);    // slower TTS (default: normal speed)
await googlehome.notify('Dinner is ready');
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
| `getDevices(timeoutMs?)` | **Discover all** Cast devices on the network → `Promise<[{name, address, port}]>`. |
| `devices(names, lang?)` | Target several devices by name; `notify`/`play` fan out to all. Chainable. |
| `ips(addresses, lang?)` | Target several devices by IP; `notify`/`play` fan out to all. Chainable. |
| `accent(code)` | TTS accent/host (`us`, `co.uk`, `com.au`, … or a full URL). Chainable. |
| `volume(level)` | Notification volume `0.0`–`1.0`; prior device volume restored after. Chainable. |
| `slow(enabled?)` | Slower TTS speech (default normal). Chainable. |
| `notify(text, cb?)` | Speak `text`. Returns a `Promise<string>`; `cb(result)` / `cb('error', err)` still work. |
| `play(url, cb?)` | Play an MP3 `url`. Same return/callback contract as `notify`. |

## HTTP listener (example/)

`example/example.js` runs a tiny server so you can trigger notifications over HTTP — handy
with IFTTT, webhooks, or home automation. It uses [ngrok](https://ngrok.com/) to
expose the endpoint outside your network.

```sh
git clone https://github.com/noelportugal/google-home-notifier
cd google-home-notifier
npm install
node example/example.js
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
