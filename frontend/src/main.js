import { createScene } from './scene.js';
import { createEarth } from './bodies/earth.js';
import { createMoon } from './bodies/moon.js';
import { createSun } from './bodies/sun.js';
import { createInterpolator } from './trajectory/interpolator.js';
import { createTrajectoryLine } from './trajectory/trajectory-line.js';
import { createEphemerisSource } from './trajectory/ephemeris-fetcher.js';
import { createTelemetryPoller } from './spacecraft/telemetry-poller.js';
import { createSpacecraftMarker } from './spacecraft/spacecraft-marker.js';
import { updateHUD } from './hud/hud.js';
import { renderTimeline, setMilestones } from './hud/timeline.js';
import { icrfToThree } from './utils/coordinates.js';
import { initLabelRenderer } from './utils/labels.js';
import { createChatPanel } from './chat/chat-ui.js';
import { createChatConnection } from './chat/chat-ws.js';

const canvas = document.getElementById('scene');
const { renderer, scene, camera, controls, sunLight } = createScene(canvas);
const labelRenderer = initLabelRenderer(camera, renderer.domElement);

// Bodies
const earth = createEarth();
scene.add(earth.mesh);

const moon = createMoon();
scene.add(moon.mesh);

const sun = createSun(sunLight);
scene.add(sun.group);

// Ephemeris — auto-refreshes from Horizons every 30 min
let moonInterp = null;
let artemisInterp = null;
let sunInterp = null;
let moonLine = null;
let artemisLine = null;

const ephemeris = createEphemerisSource();
ephemeris.onUpdate(({ moon: moonData, artemis: artemisData, sun: sunData, milestones }) => {
  // Update interpolators
  if (moonData) moonInterp = createInterpolator(moonData);
  if (artemisData) artemisInterp = createInterpolator(artemisData);
  if (sunData) sunInterp = createInterpolator(sunData);

  // Update milestones
  if (milestones) setMilestones(milestones);

  // Replace trajectory lines
  if (moonLine) scene.remove(moonLine);
  if (artemisLine) scene.remove(artemisLine);

  if (moonData) {
    moonLine = createTrajectoryLine(moonData, {
      color: 0x888888,
      opacity: 0.3,
      linewidth: 1,
    });
    scene.add(moonLine);
  }

  if (artemisData) {
    artemisLine = createTrajectoryLine(artemisData);
    scene.add(artemisLine);
  }

  console.log('[Main] Scene updated with fresh ephemeris data');
});

// Timeline
const timelineEl = document.getElementById('timeline');
const LAUNCH_EPOCH = new Date('2026-04-01T22:35:12Z');

// Manual refresh button
const refreshBtn = document.getElementById('refresh-btn');
refreshBtn.addEventListener('click', async () => {
  refreshBtn.classList.add('spinning');
  await ephemeris.refresh();
  refreshBtn.classList.remove('spinning');
});

// Chat assistant
const chatUI = createChatPanel();
const chatConn = createChatConnection(chatUI, renderer);
chatUI.onSend((text) => chatConn.send(text));

// Live telemetry
const telemetry = createTelemetryPoller();
const spacecraft = createSpacecraftMarker();
scene.add(spacecraft.group);

// Animation loop
const clock = { start: Date.now() };
let lastTimelineUpdate = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = new Date();
  const dt = (Date.now() - clock.start) / 1000;

  // Rotate Earth (uses real GMST)
  earth.update();

  // Position Moon from ephemeris
  if (moonInterp) {
    const moonPos = moonInterp.positionAt(now);
    if (moonPos) {
      const p = icrfToThree(moonPos.x, moonPos.y, moonPos.z);
      moon.mesh.position.copy(p);
    }
  }

  // Position Sun (directional light + marker) from ephemeris
  if (sunInterp) {
    const sunPos = sunInterp.positionAt(now);
    if (sunPos) sun.update(sunPos);
  }

  // Position spacecraft from Horizons ephemeris
  let craftPos = null;
  if (artemisInterp) {
    craftPos = artemisInterp.stateAt(now);
    if (craftPos) {
      spacecraft.updateFromEphemeris(craftPos);
    }
  }

  const telem = telemetry.latest();
  updateHUD(craftPos, telem, moon.mesh.position);

  // Update timeline once per second
  const nowMs = Date.now();
  if (nowMs - lastTimelineUpdate > 1000) {
    const metSeconds = (nowMs - LAUNCH_EPOCH.getTime()) / 1000;
    renderTimeline(timelineEl, metSeconds);
    lastTimelineUpdate = nowMs;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();
