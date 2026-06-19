// Type definitions for google-home-notifier

export interface GoogleHomeNotifier {
  /** Target a device by its (fuzzy) name; discovered via mDNS. Chainable. */
  device(name: string, language?: string): GoogleHomeNotifier;
  /** Target a device by IP address (skips discovery). Chainable. */
  ip(address: string, language?: string): GoogleHomeNotifier;
  /** Set the TTS accent, e.g. "us", "co.uk", "com.au", or a full host URL. Chainable. */
  accent(code: string): GoogleHomeNotifier;
  /** Set notification volume 0.0–1.0; the prior device volume is restored afterwards. Chainable. */
  volume(level: number): GoogleHomeNotifier;
  /** Toggle slower TTS speech (default: normal speed). Chainable. */
  slow(enabled?: boolean): GoogleHomeNotifier;
  /** Speak `message` on the target device. Returns a Promise; legacy callback still supported. */
  notify(message: string, callback?: (result: string, error?: Error) => void): Promise<string>;
  /** Play an MP3 `url` on the target device. Returns a Promise; legacy callback still supported. */
  play(mp3Url: string, callback?: (result: string, error?: Error) => void): Promise<string>;
}

declare const notifier: GoogleHomeNotifier;
export = notifier;
