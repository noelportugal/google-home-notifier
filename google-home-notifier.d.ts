// Type definitions for google-home-notifier

export interface GoogleHomeNotifier {
  /** Target a device by its (fuzzy) name; discovered via mDNS. Chainable. */
  device(name: string, language?: string): GoogleHomeNotifier;
  /** Target a device by IP address (skips discovery). Chainable. */
  ip(address: string, language?: string): GoogleHomeNotifier;
  /** Target several devices by name; notify/play fan out to all. Chainable. */
  devices(names: string[], language?: string): GoogleHomeNotifier;
  /** Target several devices by IP; notify/play fan out to all. Chainable. */
  ips(addresses: string[], language?: string): GoogleHomeNotifier;
  /** Set the TTS accent, e.g. "us", "co.uk", "com.au", or a full host URL. Chainable. */
  accent(code: string): GoogleHomeNotifier;
  /** Set notification volume 0.0–1.0; the prior device volume is restored afterwards. Chainable. */
  volume(level: number): GoogleHomeNotifier;
  /** Toggle slower TTS speech (default: normal speed). Chainable. */
  slow(enabled?: boolean): GoogleHomeNotifier;
  /**
   * Speak `message` on the target device(s). Returns a Promise; legacy callback supported.
   * Single target → resolves a status string. Multiple targets (devices/ips) →
   * resolves an array of `{ device, result }` / `{ device, error }` (never rejects on
   * one offline speaker).
   */
  notify(message: string, callback?: (result: NotifyResult, error?: Error) => void): Promise<NotifyResult>;
  /** Play an MP3 `url` on the target device(s). Same return/callback contract as `notify`. */
  play(mp3Url: string, callback?: (result: NotifyResult, error?: Error) => void): Promise<NotifyResult>;
}

export type DeviceResult = { device: string; result: string } | { device: string; error?: string };
export type NotifyResult = string | DeviceResult[];

declare const notifier: GoogleHomeNotifier;
export = notifier;
