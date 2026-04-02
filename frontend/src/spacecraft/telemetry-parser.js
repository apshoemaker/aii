import { PARAM } from '../utils/constants.js';

/**
 * Extract relevant values from the raw GCS telemetry JSON.
 * Returns null-safe object — missing params produce null values.
 */
export function parseTelemetry(raw) {
  function getParam(id) {
    const p = raw[`Parameter_${id}`];
    if (!p || p.Status !== 'Good') return null;
    return parseFloat(p.Value);
  }

  const posX = getParam(PARAM.POS_X);
  const posY = getParam(PARAM.POS_Y);
  const posZ = getParam(PARAM.POS_Z);
  const velX = getParam(PARAM.VEL_X);
  const velY = getParam(PARAM.VEL_Y);
  const velZ = getParam(PARAM.VEL_Z);
  const met = getParam(PARAM.MET);

  const hasPosition = posX !== null && posY !== null && posZ !== null;
  const hasVelocity = velX !== null && velY !== null && velZ !== null;

  // Telemetry positions are in FEET; convert to km (1 ft = 0.0003048 km)
  const FT_TO_KM = 0.0003048;
  return {
    position: hasPosition ? { x: posX * FT_TO_KM, y: posY * FT_TO_KM, z: posZ * FT_TO_KM } : null,
    velocity: hasVelocity ? { x: velX * FT_TO_KM, y: velY * FT_TO_KM, z: velZ * FT_TO_KM } : null,
    speed: hasVelocity ? Math.sqrt((velX * FT_TO_KM) ** 2 + (velY * FT_TO_KM) ** 2 + (velZ * FT_TO_KM) ** 2) : null,
    met,
    activity: raw?.File?.Activity || 'UNK',
    date: raw?.File?.Date || null,
  };
}
