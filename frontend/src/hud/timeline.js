/**
 * Mission timeline renderer.
 * Milestones are computed dynamically from ephemeris data.
 */

let milestones = null;

/**
 * Update milestones from ephemeris computation.
 */
export function setMilestones(ms) {
  milestones = ms;
}

/**
 * Format MET seconds as compact string.
 */
function fmtMet(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `T+${d}d ${h}h`;
  if (h > 0) return `T+${h}h ${m}m`;
  return `T+${m}m`;
}

/**
 * Get the current milestone index based on MET.
 */
function getCurrentIdx(currentMet) {
  if (!milestones) return 0;
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (currentMet >= milestones[i].met) return i;
  }
  return 0;
}

/**
 * Render timeline HTML into a container element.
 */
export function renderTimeline(container, currentMet) {
  if (!milestones) {
    container.innerHTML = '<div class="timeline-title">MISSION TIMELINE</div><div style="color:#555;font-size:11px">Loading ephemeris...</div>';
    return;
  }

  const currentIdx = getCurrentIdx(currentMet);
  const next = milestones[currentIdx + 1] || null;

  let html = '<div class="timeline-title">MISSION TIMELINE</div>';
  html += '<div class="timeline-track">';

  for (let i = 0; i < milestones.length; i++) {
    const ms = milestones[i];
    const isPast = currentMet >= ms.met;
    const isCurrent = i === currentIdx;
    const cls = isCurrent ? 'milestone current' : isPast ? 'milestone past' : 'milestone future';

    html += `<div class="${cls}">`;
    html += `<span class="ms-icon">${ms.icon}</span> `;
    html += `<span class="ms-label">${ms.label}</span>`;
    html += `<span class="ms-met">${fmtMet(ms.met)}</span>`;
    html += '</div>';
  }

  html += '</div>';

  if (next) {
    const timeToNext = next.met - currentMet;
    const h = Math.floor(timeToNext / 3600);
    const m = Math.floor((timeToNext % 3600) / 60);
    html += `<div class="timeline-next">Next: ${next.label.split(' (')[0]} in ${h}h ${m}m</div>`;
  } else {
    html += '<div class="timeline-next">Mission complete</div>';
  }

  container.innerHTML = html;
}
