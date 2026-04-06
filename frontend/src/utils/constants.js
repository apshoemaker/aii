// Scale: 1 Three.js unit = 1000 km
export const SCALE = 1 / 1000;

// Body radii — true scale
export const BODY_SCALE = 1;
export const EARTH_RADIUS_KM = 6371;
export const MOON_RADIUS_KM = 1737.4;

// Scaled radii (in Three.js units)
export const EARTH_RADIUS = EARTH_RADIUS_KM * SCALE * BODY_SCALE;
export const MOON_RADIUS = MOON_RADIUS_KM * SCALE * BODY_SCALE;

// Earth axial tilt in radians
export const EARTH_TILT = 23.44 * (Math.PI / 180);

// Earth sidereal rotation period in seconds
export const EARTH_ROTATION_PERIOD = 86164.1;

// GCS telemetry config
export const GCS_BUCKET = 'p-2-cen1';
export const GCS_OBJECT = 'October/1/October_105_1.txt';
export const GCS_BASE = 'https://storage.googleapis.com/storage/v1/b';
export const TELEMETRY_POLL_MS = 1000;

// Telemetry parameter IDs
export const PARAM = {
  POS_X: '2003',
  POS_Y: '2004',
  POS_Z: '2005',
  VEL_X: '2009',
  VEL_Y: '2010',
  VEL_Z: '2011',
  QUAT_X: '2012',
  QUAT_Y: '2013',
  QUAT_Z: '2014',
  QUAT_W: '2015',
  MET: '5001',
};

// Gravitational Sphere of Influence radii (km)
// Formula: r_SOI = a × (m/M)^(2/5)
// Earth SOI (vs Sun): a = 149,597,870.7 km, m/M = 3.003e-6
export const EARTH_SOI_KM = 929_000;
// Moon SOI (vs Earth): a = 384,400 km, m/M = 0.01230
export const MOON_SOI_KM = 66_100;

// Scaled SOI radii (Three.js units)
export const EARTH_SOI = EARTH_SOI_KM * SCALE;
export const MOON_SOI = MOON_SOI_KM * SCALE;

// Colors
export const TRAJECTORY_COLOR = 0x4fc3f7;
export const SPACECRAFT_COLOR = 0xffeb3b;
