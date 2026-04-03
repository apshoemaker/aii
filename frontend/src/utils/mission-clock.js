/**
 * Virtual mission clock — decouples simulation time from wall clock.
 *
 * Modes:
 *   'live'     — now() returns real wall-clock time
 *   'playback' — now() returns virtual time, advanced by tick() at the chosen rate
 */

// Mission time bounds
export const LAUNCH_EPOCH = new Date('2026-04-01T22:35:12Z').getTime();
export const EPHEMERIS_START = new Date('2026-04-02T02:00:00Z').getTime();
export const EPHEMERIS_END = new Date('2026-04-10T23:50:00Z').getTime();

let mode = 'live';       // 'live' | 'playback'
let rate = 1;
let paused = false;
let virtualTimeMs = Date.now();
let lastTickRealMs = null;

const listeners = [];

function clamp(ms) {
  return Math.max(EPHEMERIS_START, Math.min(EPHEMERIS_END, ms));
}

function notify() {
  for (const cb of listeners) cb();
}

function enterPlayback() {
  if (mode === 'live') {
    virtualTimeMs = clamp(Date.now());
    mode = 'playback';
  }
}

const missionClock = {
  /** Call once per animation frame before any position queries. */
  tick() {
    const realNow = Date.now();
    if (lastTickRealMs === null) {
      lastTickRealMs = realNow;
      return;
    }

    if (mode === 'playback' && !paused) {
      let delta = realNow - lastTickRealMs;
      if (delta > 1000) delta = 1000; // cap to prevent jumps after tab backgrounding
      virtualTimeMs += delta * rate;

      // Auto-pause at ephemeris boundary
      if (virtualTimeMs >= EPHEMERIS_END) {
        virtualTimeMs = EPHEMERIS_END;
        paused = true;
        notify();
      } else if (virtualTimeMs <= EPHEMERIS_START) {
        virtualTimeMs = EPHEMERIS_START;
        paused = true;
        notify();
      }
    }

    lastTickRealMs = realNow;
  },

  /** Current simulation time as a Date. */
  now() {
    return mode === 'live' ? new Date() : new Date(virtualTimeMs);
  },

  /** Current simulation time in ms (replaces Date.now()). */
  nowMs() {
    return mode === 'live' ? Date.now() : virtualTimeMs;
  },

  /** Scrub to an absolute time (ms). Enters playback mode. */
  setTime(ms) {
    mode = 'playback';
    virtualTimeMs = clamp(ms);
    notify();
  },

  /** Set playback rate (1, 2, 4, 10). Rate > 1 enters playback. */
  setRate(r) {
    rate = r;
    if (r > 1) {
      enterPlayback();
    } else if (r === 1 && mode === 'playback' && !paused) {
      // Auto-switch to live if virtual time is close to real time
      if (Math.abs(virtualTimeMs - Date.now()) < 5000) {
        mode = 'live';
        paused = false;
      }
    }
    notify();
  },

  /** Resume time advancement. */
  play() {
    if (mode === 'live') return;
    paused = false;
    notify();
  },

  /** Pause time advancement. Enters playback mode. */
  pause() {
    enterPlayback();
    paused = true;
    notify();
  },

  /** Return to real-time mode. */
  goLive() {
    mode = 'live';
    rate = 1;
    paused = false;
    notify();
  },

  isLive() { return mode === 'live'; },
  isPaused() { return paused; },
  getRate() { return rate; },

  /** Progress 0–1 within ephemeris window. */
  getProgress() {
    const ms = mode === 'live' ? Date.now() : virtualTimeMs;
    return (ms - EPHEMERIS_START) / (EPHEMERIS_END - EPHEMERIS_START);
  },

  /** Register a state-change listener. */
  onChange(cb) {
    listeners.push(cb);
  },
};

export default missionClock;
