/**
 * Fetch ephemeris data from JPL Horizons API for Artemis II and the Moon.
 * Writes JSON files to public/data/.
 *
 * Usage: node scripts/fetch-ephemeris.js
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

// Mission window
const START = '2026-04-02 02:00';
const STOP = '2026-04-10 23:50';
const STEP = '10 min';

async function fetchHorizons(command, label) {
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${command}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@399'",
    REF_PLANE: 'FRAME',
    REF_SYSTEM: 'ICRF',
    VEC_TABLE: '2',
    VEC_LABELS: 'NO',
    CSV_FORMAT: 'YES',
    START_TIME: `'${START}'`,
    STOP_TIME: `'${STOP}'`,
    STEP_SIZE: `'${STEP}'`,
  });

  console.log(`Fetching ${label} (${command})...`);
  const res = await fetch(`${HORIZONS_API}?${params}`);
  if (!res.ok) throw new Error(`Horizons API returned ${res.status}`);
  const text = await res.text();
  return text;
}

function parseVectors(text) {
  const lines = text.split('\n');

  // Find $$SOE and $$EOE markers
  const soeIdx = lines.findIndex(l => l.trim() === '$$SOE');
  const eoeIdx = lines.findIndex(l => l.trim() === '$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) {
    console.error('Could not find $$SOE/$$EOE markers in response');
    console.error('Response snippet:', text.substring(0, 2000));
    return [];
  }

  const data = [];
  for (let i = soeIdx + 1; i < eoeIdx; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV format: JDTDB, Calendar Date, X, Y, Z, VX, VY, VZ,
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 8) continue;

    const jd = parseFloat(parts[0]);
    const x = parseFloat(parts[2]);
    const y = parseFloat(parts[3]);
    const z = parseFloat(parts[4]);
    const vx = parseFloat(parts[5]);
    const vy = parseFloat(parts[6]);
    const vz = parseFloat(parts[7]);

    if (isNaN(jd)) continue;

    data.push({ jd, x, y, z, vx, vy, vz });
  }

  return data;
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  // Fetch Moon ephemeris
  const moonText = await fetchHorizons('301', 'Moon');
  const moonData = parseVectors(moonText);
  console.log(`  Parsed ${moonData.length} Moon data points`);
  writeFileSync(join(DATA_DIR, 'ephemeris-moon.json'), JSON.stringify(moonData));

  // Fetch Sun ephemeris
  const sunText = await fetchHorizons('10', 'Sun');
  const sunData = parseVectors(sunText);
  console.log(`  Parsed ${sunData.length} Sun data points`);
  writeFileSync(join(DATA_DIR, 'ephemeris-sun.json'), JSON.stringify(sunData));

  // Fetch Artemis II ephemeris
  try {
    const artemisText = await fetchHorizons('-1024', 'Artemis II');
    const artemisData = parseVectors(artemisText);
    console.log(`  Parsed ${artemisData.length} Artemis II data points`);
    if (artemisData.length > 0) {
      writeFileSync(join(DATA_DIR, 'ephemeris-artemis.json'), JSON.stringify(artemisData));
    } else {
      console.warn('  No Artemis II vector data parsed — check Horizons response');
      writeFileSync(join(DATA_DIR, 'debug-artemis-response.txt'), artemisText);
    }
  } catch (e) {
    console.error('  Artemis II fetch failed:', e.message);
    console.log('  (This is expected if target -1024 is not yet in Horizons)');
  }

  console.log('Done. Files written to public/data/');
}

main().catch(console.error);
