import { GCS_BASE, GCS_BUCKET, GCS_OBJECT, TELEMETRY_POLL_MS } from '../utils/constants.js';
import { parseTelemetry } from './telemetry-parser.js';

/**
 * Polls the GCS bucket for live Orion telemetry.
 * Two-step: fetch metadata (for generation), then fetch content.
 */
export function createTelemetryPoller() {
  let latestData = null;
  let lastUpdate = 0;

  const metaUrl = `${GCS_BASE}/${GCS_BUCKET}/o/${encodeURIComponent(GCS_OBJECT)}`;

  async function poll() {
    try {
      // Step 1: get object metadata for current generation
      const metaRes = await fetch(metaUrl, { cache: 'no-store' });
      if (!metaRes.ok) throw new Error(`Metadata ${metaRes.status}`);
      const meta = await metaRes.json();

      // Step 2: fetch actual content
      const contentUrl = `${metaUrl}?alt=media&generation=${meta.generation}`;
      const contentRes = await fetch(contentUrl, { cache: 'no-store' });
      if (!contentRes.ok) throw new Error(`Content ${contentRes.status}`);
      const raw = await contentRes.json();

      latestData = parseTelemetry(raw);
      lastUpdate = Date.now();
    } catch (e) {
      console.warn('Telemetry poll failed:', e.message);
    }
  }

  // Start polling
  poll();
  setInterval(poll, TELEMETRY_POLL_MS);

  return {
    latest() {
      if (!latestData) return null;
      return {
        ...latestData,
        age: Date.now() - lastUpdate,
      };
    },
  };
}
