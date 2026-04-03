/**
 * Collapsible telemetry panel — shows all raw parameters grouped by category.
 * Updates only when new telemetry values arrive.
 */

const PARAM_LABELS = {
  '2003': { label: 'Position X', unit: 'ft', cat: 'position' },
  '2004': { label: 'Position Y', unit: 'ft', cat: 'position' },
  '2005': { label: 'Position Z', unit: 'ft', cat: 'position' },
  '2009': { label: 'Velocity X', unit: 'ft/s', cat: 'velocity' },
  '2010': { label: 'Velocity Y', unit: 'ft/s', cat: 'velocity' },
  '2011': { label: 'Velocity Z', unit: 'ft/s', cat: 'velocity' },
  '2012': { label: 'Quaternion X', unit: '', cat: 'attitude' },
  '2013': { label: 'Quaternion Y', unit: '', cat: 'attitude' },
  '2014': { label: 'Quaternion Z', unit: '', cat: 'attitude' },
  '2015': { label: 'Quaternion W', unit: '', cat: 'attitude' },
  '2016': { label: 'SC Mode/Submode', unit: 'hex', cat: 'status' },
  '2025': { label: 'Status Flag', unit: '', cat: 'status' },
  '2026': { label: 'Cmd Counter', unit: '', cat: 'status' },
  '2048': { label: 'SA Ref Angle', unit: 'rad', cat: 'solar' },
  '2049': { label: 'SA1 Pitch', unit: 'rad', cat: 'solar' },
  '2050': { label: 'SA1 Yaw', unit: 'rad', cat: 'solar' },
  '2051': { label: 'SA1 Roll', unit: 'rad', cat: 'solar' },
  '2052': { label: 'SA2 Pitch', unit: 'rad', cat: 'solar' },
  '2053': { label: 'SA2 Yaw', unit: 'rad', cat: 'solar' },
  '2054': { label: 'SA2 Roll', unit: 'rad', cat: 'solar' },
  '2055': { label: 'SA2 Angle 2', unit: 'rad', cat: 'solar' },
  '2056': { label: 'SA3 Pitch', unit: 'rad', cat: 'solar' },
  '2057': { label: 'SA3 Yaw', unit: 'rad', cat: 'solar' },
  '2058': { label: 'SA3 Roll', unit: 'rad', cat: 'solar' },
  '2059': { label: 'SA3 Angle 2', unit: 'rad', cat: 'solar' },
  '2060': { label: 'SA4 Pitch', unit: 'rad', cat: 'solar' },
  '2061': { label: 'SA4 Yaw', unit: 'rad', cat: 'solar' },
  '2062': { label: 'SA4 Roll', unit: 'rad', cat: 'solar' },
  '2063': { label: 'SA4 Angle 2', unit: 'rad', cat: 'solar' },
  '2064': { label: 'Antenna Pitch', unit: 'rad', cat: 'solar' },
  '2065': { label: 'Antenna Yaw', unit: 'rad', cat: 'solar' },
  '2066': { label: 'Orbit Angle 1', unit: 'rad', cat: 'orbital' },
  '2067': { label: 'Orbit Angle 2', unit: 'rad', cat: 'orbital' },
  '2068': { label: 'Orbit Angle 3', unit: 'rad', cat: 'orbital' },
  '2069': { label: 'Sun Vec X', unit: '', cat: 'vectors' },
  '2070': { label: 'Sun Vec Y', unit: '', cat: 'vectors' },
  '2071': { label: 'Sun Vec Z', unit: '', cat: 'vectors' },
  '2072': { label: 'Moon Vec X', unit: '', cat: 'vectors' },
  '2073': { label: 'Moon Vec Y', unit: '', cat: 'vectors' },
  '2074': { label: 'Moon Vec Z', unit: '', cat: 'vectors' },
  '2075': { label: 'Earth Vec X', unit: '', cat: 'vectors' },
  '2076': { label: 'Earth Vec Y', unit: '', cat: 'vectors' },
  '2077': { label: 'Earth Vec Z', unit: '', cat: 'vectors' },
  '2078': { label: 'Nadir Vec Mag', unit: '', cat: 'vectors' },
  '2079': { label: 'Ang Offset 1', unit: 'rad', cat: 'vectors' },
  '2080': { label: 'Ang Offset 2', unit: 'rad', cat: 'vectors' },
  '2081': { label: 'Ang Offset 3', unit: 'rad', cat: 'vectors' },
  '2082': { label: 'Ang Offset 4', unit: 'rad', cat: 'vectors' },
  '2083': { label: 'RCS Metric 1', unit: '', cat: 'propulsion' },
  '2084': { label: 'RCS Metric 2', unit: '', cat: 'propulsion' },
  '2085': { label: 'RCS Metric 3', unit: '', cat: 'propulsion' },
  '2086': { label: 'RCS Metric 4', unit: '', cat: 'propulsion' },
  '2087': { label: 'Delta-V 1', unit: '', cat: 'propulsion' },
  '2088': { label: 'Delta-V 2', unit: '', cat: 'propulsion' },
  '2089': { label: 'Delta-V 3', unit: '', cat: 'propulsion' },
  '2090': { label: 'GNC Mode', unit: 'hex', cat: 'status' },
  '2091': { label: 'Rate X (Roll)', unit: 'rad/s', cat: 'rates' },
  '2092': { label: 'Rate Y (Pitch)', unit: 'rad/s', cat: 'rates' },
  '2093': { label: 'Rate Z (Yaw)', unit: 'rad/s', cat: 'rates' },
  '2094': { label: 'Rate Magnitude', unit: 'rad/s', cat: 'rates' },
  '2095': { label: 'Sensor Angle 1', unit: 'rad', cat: 'sensors' },
  '2096': { label: 'Sensor Angle 2', unit: 'rad', cat: 'sensors' },
  '2097': { label: 'Sensor Angle 3', unit: 'rad', cat: 'sensors' },
  '2098': { label: 'Sensor Angle 4', unit: 'rad', cat: 'sensors' },
  '2099': { label: 'Sensor Status', unit: 'hex', cat: 'status' },
  '2101': { label: 'Fine Att X', unit: 'rad/s', cat: 'rates' },
  '2102': { label: 'Fine Att Y', unit: 'rad/s', cat: 'rates' },
  '2103': { label: 'Fine Att Z', unit: 'rad/s', cat: 'rates' },
  '5001': { label: 'MET', unit: 's', cat: 'time' },
  '5002': { label: 'Temp Sensor 1', unit: '°C', cat: 'thermal' },
  '5003': { label: 'Temp Sensor 2', unit: '°C', cat: 'thermal' },
  '5004': { label: 'Temp Sensor 3', unit: '°C', cat: 'thermal' },
  '5005': { label: 'Temp Sensor 4', unit: '°C', cat: 'thermal' },
  '5006': { label: 'Sun Angle 1', unit: '°', cat: 'pointing' },
  '5007': { label: 'Sun Angle 2', unit: '°', cat: 'pointing' },
  '5008': { label: 'Sun Angle 3', unit: '°', cat: 'pointing' },
  '5009': { label: 'Sun Angle 4', unit: '°', cat: 'pointing' },
  '5010': { label: 'GPS Time 1', unit: 's', cat: 'time' },
  '5011': { label: 'GPS Time 2', unit: 's', cat: 'time' },
  '5012': { label: 'GPS Time 3', unit: 's', cat: 'time' },
  '5013': { label: 'Onboard Clock', unit: 's', cat: 'time' },
  '5016': { label: 'MET Int', unit: 's', cat: 'time' },
  '5017': { label: 'MET Int 2', unit: 's', cat: 'time' },
};

const CATEGORIES = [
  { key: 'position', name: 'Position' },
  { key: 'velocity', name: 'Velocity' },
  { key: 'attitude', name: 'Attitude' },
  { key: 'rates', name: 'Angular Rates' },
  { key: 'thermal', name: 'Thermal' },
  { key: 'solar', name: 'Solar Arrays & Antenna' },
  { key: 'orbital', name: 'Orbital Geometry' },
  { key: 'vectors', name: 'Direction Vectors' },
  { key: 'propulsion', name: 'Propulsion / RCS' },
  { key: 'sensors', name: 'Star Tracker / Sensors' },
  { key: 'pointing', name: 'Pointing / Sun Angles' },
  { key: 'status', name: 'Status Codes' },
  { key: 'time', name: 'Time References' },
];

let panelEl = null;
let contentEl = null;
let toggleEl = null;
let arrowEl = null;
let expanded = false;
let lastParams = null;

function formatValue(val, unit) {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (unit === 'hex') return val;
  if (Math.abs(num) > 1e6) return num.toExponential(4);
  if (Math.abs(num) < 0.001 && num !== 0) return num.toExponential(4);
  return num.toFixed(4);
}

function renderParams(allParams) {
  let html = '';

  for (const cat of CATEGORIES) {
    const rows = [];
    for (const [pid, info] of Object.entries(PARAM_LABELS)) {
      if (info.cat !== cat.key) continue;
      if (!(pid in allParams)) continue;
      const val = formatValue(allParams[pid], info.unit);
      const unitStr = info.unit ? ` ${info.unit}` : '';
      rows.push(`<div class="tp-row"><span class="tp-label">${info.label}</span><span class="tp-value">${val}${unitStr}</span></div>`);
    }
    if (rows.length === 0) continue;
    html += `<div class="tp-category">${cat.name}</div>`;
    html += rows.join('');
  }

  // Show any unlabeled params
  const labeled = new Set(Object.keys(PARAM_LABELS));
  const unlabeled = Object.keys(allParams).filter(pid => !labeled.has(pid)).sort();
  if (unlabeled.length > 0) {
    html += '<div class="tp-category">Other</div>';
    for (const pid of unlabeled) {
      html += `<div class="tp-row"><span class="tp-label">Param ${pid}</span><span class="tp-value">${allParams[pid]}</span></div>`;
    }
  }

  return html || '<div style="color:#555">No telemetry data</div>';
}

export function initTelemetryPanel() {
  panelEl = document.getElementById('telemetry-panel');
  contentEl = document.getElementById('tp-content');
  toggleEl = document.getElementById('tp-toggle');
  arrowEl = document.getElementById('tp-arrow');

  if (!toggleEl) return;

  toggleEl.addEventListener('click', () => {
    expanded = !expanded;
    panelEl.classList.toggle('expanded', expanded);
    arrowEl.textContent = expanded ? '▲' : '▼';
    if (expanded && lastParams) {
      contentEl.innerHTML = renderParams(lastParams);
    }
  });
}

let lastRenderTime = 0;

export function updateTelemetryPanel(telem) {
  if (!contentEl) return;
  if (!telem?.allParams) return;

  lastParams = telem.allParams;

  // Re-render at most once per second when expanded
  if (expanded) {
    const now = Date.now();
    if (now - lastRenderTime > 1000) {
      contentEl.innerHTML = renderParams(lastParams);
      lastRenderTime = now;
    }
  }
}
