/**
 * NASA Images gallery — fetches Artemis II images from the NASA Images API
 * and rotates through them.
 */

const API_BASE = 'https://images-api.nasa.gov/search?q=Artemis_II&media_type=image&page_size=100';
const ROTATE_INTERVAL = 15_000; // 15 seconds between auto-advance

let images = [];
let currentIndex = 0;
let rotateTimer = null;
let totalPages = 1;

let imgEl, captionEl, counterEl;

async function fetchImages() {
  try {
    // First fetch to get total hits, then pick a random page
    if (totalPages === 1) {
      const probe = await fetch(`${API_BASE}&page=1`);
      if (!probe.ok) throw new Error(`API ${probe.status}`);
      const probeData = await probe.json();
      const totalHits = probeData.collection?.metadata?.total_hits || 100;
      totalPages = Math.ceil(totalHits / 100);
    }

    const page = Math.floor(Math.random() * totalPages) + 1;
    const res = await fetch(`${API_BASE}&page=${page}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    const items = data.collection?.items || [];
    const newImages = items
      .filter(item => item.links?.length > 0)
      .map(item => {
        const meta = item.data?.[0] || {};
        const thumb = item.links.find(l => l.rel === 'preview')?.href || item.links[0]?.href;
        // Get medium resolution from the collection href
        const collectionHref = item.href;
        return {
          thumb,
          collectionHref,
          title: meta.title || '',
          description: meta.description || '',
          date: meta.date_created ? new Date(meta.date_created).toLocaleDateString() : '',
          nasaId: meta.nasa_id || '',
        };
      });

    // Replace with new page of images
    images = newImages;
    currentIndex = 0;

    if (images.length > 0) {
      showImage(0);
    }

    console.log(`[Gallery] Loaded ${images.length} images (random page, ${totalPages} pages total)`);
  } catch (e) {
    console.warn('Gallery fetch failed:', e.message);
  }
}

async function getImageUrl(img) {
  // Try to get a medium-res image from the asset manifest
  if (img.collectionHref) {
    try {
      const res = await fetch(img.collectionHref);
      if (res.ok) {
        const assets = await res.json();
        // Prefer medium, then large, then first jpg
        const medium = assets.find(u => u.includes('~medium.'));
        const large = assets.find(u => u.includes('~large.'));
        const anyJpg = assets.find(u => u.endsWith('.jpg'));
        if (medium) return medium;
        if (large) return large;
        if (anyJpg) return anyJpg;
      }
    } catch (e) {
      // fall through to thumb
    }
  }
  return img.thumb;
}

async function showImage(index) {
  if (images.length === 0) return;
  currentIndex = ((index % images.length) + images.length) % images.length;
  const img = images[currentIndex];

  counterEl.textContent = `${currentIndex + 1}/${images.length}`;
  captionEl.textContent = img.title;
  imgEl.title = img.description || img.title;

  // Link to NASA image page
  const link = document.getElementById('gallery-link');
  if (link) {
    link.href = `https://images.nasa.gov/details/${encodeURIComponent(img.nasaId)}`;
    link.title = img.description || img.title;
  }

  const url = await getImageUrl(img);
  imgEl.src = url;
  imgEl.alt = img.title;
}

function next() {
  showImage(currentIndex + 1);
  resetTimer();
}

function prev() {
  showImage(currentIndex - 1);
  resetTimer();
}

function resetTimer() {
  if (rotateTimer) clearInterval(rotateTimer);
  rotateTimer = setInterval(() => showImage(currentIndex + 1), ROTATE_INTERVAL);
}

export function initGallery() {
  imgEl = document.getElementById('gallery-img');
  captionEl = document.getElementById('gallery-caption');
  counterEl = document.getElementById('gallery-counter');
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');

  if (!imgEl) return;

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  fetchImages();
  resetTimer();

  // Refresh image list every 30 minutes
  setInterval(fetchImages, 30 * 60 * 1000);
}
