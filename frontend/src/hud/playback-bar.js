/**
 * Playback bar UI — wires slider, play/pause, speed buttons, and LIVE button
 * to the mission clock.
 */
import missionClock, { EPHEMERIS_START, EPHEMERIS_END, LAUNCH_EPOCH } from '../utils/mission-clock.js';
import { formatMET } from '../utils/time.js';

let slider, timeLabel, playPauseBtn, liveBtn, speedBtns;
let wasPausedBeforeDrag = false;
let dragging = false;

function sliderToMs(value) {
  return EPHEMERIS_START + value * (EPHEMERIS_END - EPHEMERIS_START);
}

function syncUI() {
  const isLive = missionClock.isLive();
  const isPaused = missionClock.isPaused();
  const rate = missionClock.getRate();

  // LIVE button
  liveBtn.classList.toggle('active', isLive);

  // Play/Pause icon
  playPauseBtn.textContent = (isLive || !isPaused) ? '\u23F8' : '\u25B6';
  playPauseBtn.title = (isLive || !isPaused) ? 'Pause' : 'Play';

  // Speed buttons
  speedBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.rate) === rate);
  });
}

export function initPlaybackBar() {
  slider = document.getElementById('pb-slider');
  timeLabel = document.getElementById('pb-time-label');
  playPauseBtn = document.getElementById('pb-play-pause');
  liveBtn = document.getElementById('pb-live');
  speedBtns = document.querySelectorAll('.pb-speed-btn');

  if (!slider) return;

  // Slider scrub
  slider.addEventListener('input', () => {
    missionClock.setTime(sliderToMs(parseFloat(slider.value)));
  });

  // Auto-pause during drag
  slider.addEventListener('mousedown', () => {
    dragging = true;
    wasPausedBeforeDrag = missionClock.isPaused();
    if (!missionClock.isLive()) missionClock.pause();
  });
  slider.addEventListener('touchstart', () => {
    dragging = true;
    wasPausedBeforeDrag = missionClock.isPaused();
    if (!missionClock.isLive()) missionClock.pause();
  }, { passive: true });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (!wasPausedBeforeDrag && !missionClock.isLive()) {
      missionClock.play();
    }
  }
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);

  // Play / Pause
  playPauseBtn.addEventListener('click', () => {
    if (missionClock.isLive()) {
      missionClock.pause();
    } else if (missionClock.isPaused()) {
      missionClock.play();
    } else {
      missionClock.pause();
    }
  });

  // LIVE
  liveBtn.addEventListener('click', () => {
    missionClock.goLive();
  });

  // Speed buttons
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      missionClock.setRate(parseInt(btn.dataset.rate));
    });
  });

  // React to clock state changes
  missionClock.onChange(syncUI);
  syncUI();
}

/** Call each frame to keep slider and time label in sync. */
export function updatePlaybackBar() {
  if (!slider) return;

  // Update slider position (unless user is dragging)
  if (!dragging) {
    const progress = missionClock.getProgress();
    slider.value = Math.max(0, Math.min(1, progress));
  }

  // Update time label
  const metSeconds = (missionClock.nowMs() - LAUNCH_EPOCH) / 1000;
  if (metSeconds < 0) {
    timeLabel.textContent = 'Pre-launch';
  } else {
    timeLabel.textContent = formatMET(metSeconds);
  }
}
