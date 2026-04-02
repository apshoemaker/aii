/**
 * Convert a Julian Date to a JS Date.
 */
export function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

/**
 * Convert a JS Date to Julian Date.
 */
export function dateToJd(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Format seconds as DD:HH:MM:SS mission elapsed time string.
 */
export function formatMET(totalSeconds) {
  const neg = totalSeconds < 0;
  let s = Math.abs(Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  const seconds = s - minutes * 60;

  const pad = (n) => String(n).padStart(2, '0');
  const str = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return neg ? `-${str}` : str;
}

/**
 * Format a number with commas and fixed decimal places.
 */
function formatNum(n, decimals = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format km to miles string with full precision.
 */
export function kmToMilesStr(km) {
  const miles = Math.abs(km) * 0.621371;
  return `${formatNum(miles)} mi`;
}

/**
 * Format km/s to mph string with full precision.
 */
export function kmsToMphStr(kms) {
  const mph = Math.abs(kms) * 2236.94;
  return `${formatNum(mph)} mph`;
}
